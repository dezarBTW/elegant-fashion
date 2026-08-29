-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- For ElegantstylesWebsite Supabase Database
-- ============================================

-- ============================================
-- USERS TABLE RLS
-- ============================================

-- Keep deactivated profiles in the database while preventing them from signing in.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Use a security-definer helper so admin policies do not recursively query
-- public.users through its own row-level security policies.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Policy: Users can view their own record
CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (
  public.is_admin_user()
);

-- Policy: Users can update their own record (but not is_admin field)
CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = public.is_admin_user()
);

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (
  public.is_admin_user()
);

-- Policy: Service role (bypasses RLS) can insert users for new sign-ups
CREATE POLICY "Service role can insert users"
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow an authenticated user to restore a missing profile for their own account.
CREATE POLICY "Users can insert own data"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- AUTOMATIC USER PROFILE CREATION TRIGGER
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, username, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    false
  );
  RETURN NEW;
END;
$$;

-- Create trigger to fire on new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STUDENTS TABLE RLS
-- ============================================

-- Enable RLS on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert own data" ON public.students;
DROP POLICY IF EXISTS "Students can update own data" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins can update all students" ON public.students;

-- Policy: Students can view their own record
CREATE POLICY "Students can view own data"
ON public.students
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all students
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
USING (
  public.is_admin_user()
);

-- Policy: Students can insert their own record
CREATE POLICY "Students can insert own data"
ON public.students
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Students can update their own record (but not accepted status)
CREATE POLICY "Students can update own data"
ON public.students
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND accepted = (SELECT accepted FROM public.students WHERE id = public.students.id)
);

-- Policy: Admins can update all students (including accepted status)
CREATE POLICY "Admins can update all students"
ON public.students
FOR UPDATE
USING (
  public.is_admin_user()
);

-- ============================================
-- PRODUCTS TABLE RLS
-- ============================================

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Policy: Public can view all products
CREATE POLICY "Public can view products"
ON public.products
FOR SELECT
USING (true);

-- Policy: Admins can insert products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  public.is_admin_user()
);

-- Policy: Admins can update products
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
USING (
  public.is_admin_user()
);

-- Policy: Admins can delete products
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
USING (
  public.is_admin_user()
);

-- ============================================
-- STORAGE BUCKET POLICIES
-- ============================================

-- Product Images Bucket
-- Allow public read access
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Allow admins to upload to product-images
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin_user()
  AND (storage.foldername(name))[1] = 'products'
  AND (storage.filename(name)) ~ '\.(jpg|png)$'
  AND (metadata->>'mimetype') IN ('image/jpeg', 'image/png')
  AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
);

-- Allow admins to delete from product-images
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images'
  AND public.is_admin_user()
);

-- Student Passports Bucket
-- Allow users to upload only to their own folder.
-- NOTE: metadata->>'mimetype' / metadata->>'size' are NOT reliable on insert,
-- so type/size are enforced client-side (validateImageFile). Security here is
-- limited to: own folder + passport.(jpg|png) filename.
DROP POLICY IF EXISTS "Users can upload own passport" ON storage.objects;
CREATE POLICY "Users can upload own passport"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'student-passports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.filename(name)) ~* '^passport\.(jpg|png)$'
);

-- Allow users to update (re-upload) their own passport.
-- NOTE: required because the client calls storage.upload() with upsert: true,
-- which performs an UPDATE on storage.objects when a file already exists at
-- that path. Without this policy, re-uploads fail with "new row violates
-- row-level security policy".
DROP POLICY IF EXISTS "Users can update own passport" ON storage.objects;
CREATE POLICY "Users can update own passport"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'student-passports'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'student-passports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.filename(name)) ~* '^passport\.(jpg|png)$'
);

-- Allow users to view their own passport
DROP POLICY IF EXISTS "Users can view own passport" ON storage.objects;
CREATE POLICY "Users can view own passport"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'student-passports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all student passports
DROP POLICY IF EXISTS "Admins can view all passports" ON storage.objects;
CREATE POLICY "Admins can view all passports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'student-passports'
  AND public.is_admin_user()
);

-- Allow admins to delete student passports
DROP POLICY IF EXISTS "Admins can delete passports" ON storage.objects;
CREATE POLICY "Admins can delete passports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'student-passports'
  AND public.is_admin_user()
);

-- ============================================
-- HELPER FUNCTION FOR ADMIN CHECK
-- ============================================

-- Create a function to simplify admin checks
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.is_admin_user();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================
-- DEBUGGING QUERIES
-- ============================================

-- Check if user records exist in the users table
-- Run this in Supabase SQL Editor to diagnose username issues:
--
-- SELECT id, username, email, is_admin, created_at
-- FROM public.users
-- ORDER BY created_at DESC;
--
-- Check auth.users to see what metadata is stored:
--
-- SELECT id, email, raw_user_meta_data
-- FROM auth.users
-- ORDER BY created_at DESC;
--
-- If username is missing from users table, the trigger may have failed.
-- First, find your user's UUID by running:
--
-- SELECT id, email, raw_user_meta_data
-- FROM auth.users
-- WHERE email = 'your_email@example.com';
--
-- Then manually update the username using the actual UUID:
--
-- UPDATE public.users
-- SET username = 'desired_username'
-- WHERE id = 'ACTUAL_UUID_FROM_QUERY_ABOVE';
--
-- Or update all users with missing usernames to use their email prefix:
--
-- UPDATE public.users
-- SET username = split_part(email, '@', 1)
-- WHERE username IS NULL OR username = '';