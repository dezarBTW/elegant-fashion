-- Bespoke Requests Table Migration
-- Creates the table for storing bespoke tailoring requests

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the bespoke_requests table
CREATE TABLE public.bespoke_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional customer name
  name TEXT,
  
  -- Required phone number (normalized to E.164 format)
  phone TEXT NOT NULL,
  
  -- Required description
  description TEXT NOT NULL,
  
  -- Array of image paths in Supabase Storage (max 4)
  image_paths TEXT[] DEFAULT '{}',
  
  -- Request status for admin tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'completed', 'cancelled')),
  
  -- Honeypot field for spam protection (should remain empty)
  company_name TEXT,
  
  -- IP address for rate limiting (hashed for privacy)
  ip_hash TEXT,
  
  -- User agent for spam analysis
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.bespoke_requests ENABLE ROW LEVEL SECURITY;

-- The public form writes through a server-side service-role client only.
-- Keep all direct client access limited to admins.
CREATE POLICY "Admins can view all bespoke requests"
ON public.bespoke_requests
FOR SELECT
USING (public.is_admin_user());

-- Admins can update requests (status changes, notes)
CREATE POLICY "Admins can update bespoke requests"
ON public.bespoke_requests
FOR UPDATE
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Admins can delete requests
CREATE POLICY "Admins can delete bespoke requests"
ON public.bespoke_requests
FOR DELETE
USING (public.is_admin_user());

-- Table-level grants
GRANT SELECT, UPDATE, DELETE ON public.bespoke_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bespoke_requests TO service_role;

-- Indexes for performance
CREATE INDEX idx_bespoke_requests_created_at ON public.bespoke_requests (created_at DESC);
CREATE INDEX idx_bespoke_requests_status ON public.bespoke_requests (status);
CREATE INDEX idx_bespoke_requests_phone ON public.bespoke_requests (phone);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bespoke_requests_updated ON public.bespoke_requests;
CREATE TRIGGER on_bespoke_requests_updated
  BEFORE UPDATE ON public.bespoke_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();