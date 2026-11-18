import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20261118111252_student_decline_corrections.sql", import.meta.url), "utf8");
const restriction = await readFile(new URL("../supabase/migrations/20261118130048_restrict_passport_correction_paths.sql", import.meta.url), "utf8");
const qualifiedPolicy = await readFile(new URL("../supabase/migrations/20261118130219_qualify_passport_policy_filename.sql", import.meta.url), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const original = `https://example.supabase.co/storage/v1/object/public/student-passports/${userId}/passport.jpg`;
const replacement = `https://example.supabase.co/storage/v1/object/public/student-passports/${userId}/passport-2`;

test("decline clears the old passport and resubmission changes only permitted details", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION storage.foldername(p text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(p,'/') $$;
      CREATE FUNCTION storage.filename(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(p,'^.*/','') $$;
      CREATE TABLE storage.objects (bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can upload own passport" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Users can update own passport" ON storage.objects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE FUNCTION public.storage_path_from_value(p_bucket text,p_value text) RETURNS text LANGUAGE sql IMMUTABLE
        AS $$ SELECT regexp_replace(p_value,'^.*/student-passports/','') $$;
      CREATE TABLE public.students (
        id bigint PRIMARY KEY, user_id uuid, name text, surname text, first_name text, middle_name text, gender text,
        date_of_birth date, age integer, nationality text, marital_status text, state_of_origin text,
        address text, telephone text, email text, chosen_programme text, sponsorship text,
        sponsor_organization text, passport_photo text, status text DEFAULT 'pending', accepted boolean DEFAULT false
      );
      GRANT USAGE ON SCHEMA public TO service_role,authenticated;
      GRANT ALL ON public.students TO service_role;
      GRANT USAGE ON SCHEMA storage TO authenticated;
      GRANT INSERT ON storage.objects TO authenticated;
      GRANT SELECT ON public.students TO authenticated;
      GRANT EXECUTE ON FUNCTION storage.foldername(text),storage.filename(text) TO authenticated;
    `);
    await db.exec(migration);
    await db.exec(restriction);
    await db.exec(qualifiedPolicy);
    await db.query(`INSERT INTO public.students (id,user_id,surname,first_name,email,passport_photo,status,accepted)
      VALUES (1,$1,'Original','Ada','student@example.invalid',$2,'pending',false)`, [userId, original]);
    const reason = "The surname does not match the submitted documents.";
    const result = await db.query("SELECT public.decline_student_application(1,$1,ARRAY['surname']) AS student", [reason]);
    const declined = result.rows[0].student;
    assert.equal(declined.status, "declined");
    assert.equal(declined.passport_photo, null);
    assert.equal(declined.declined_passport_path, `${userId}/passport.jpg`);
    assert.equal(declined.decline_reason, reason);
    assert.deepEqual(declined.correction_fields, ["surname"]);
    assert.equal(declined.decline_revision, 1);
    const revised = await db.query("SELECT public.decline_student_application(1,$1,ARRAY['surname']) AS student", ["The surname still needs correction."]);
    assert.equal(revised.rows[0].student.decline_revision, 2);
    assert.equal(revised.rows[0].student.declined_passport_path, `${userId}/passport.jpg`);
    await db.exec("SET ROLE authenticated");
    await assert.rejects(db.query("SELECT public.decline_student_application(1,'Invalid reason',ARRAY[]::text[])", []), { code: "42501" });
    await db.exec("RESET ROLE");
    await assert.rejects(db.query("SELECT public.resubmit_student_application($1,1,$2::jsonb,$3)",
      [userId, JSON.stringify({ email: "changed@example.invalid" }), replacement]), { code: "23514" });
    await db.query("UPDATE public.students SET correction_opened_at=now() WHERE id=1");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId]);
    await db.exec("SET ROLE authenticated");
    await db.query("INSERT INTO storage.objects VALUES ('student-passports',$1)", [`${userId}/passport-2`]);
    await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('student-passports',$1)", [`${userId}/passport-999`]), { code: "42501" });
    await db.exec("RESET ROLE");
    await assert.rejects(db.query("SELECT public.resubmit_student_application($1,1,$2::jsonb,$3)",
      [userId, JSON.stringify({ email: "changed@example.invalid" }), replacement]), { code: "23514" });
    const submitted = await db.query("SELECT public.resubmit_student_application($1,1,$2::jsonb,$3) AS student",
      [userId, JSON.stringify({ surname: "Corrected" }), replacement]);
    assert.equal(submitted.rows[0].student.status, "pending");
    assert.equal(submitted.rows[0].student.surname, "Corrected");
    assert.equal(submitted.rows[0].student.email, "student@example.invalid");
    assert.equal(submitted.rows[0].student.passport_photo, replacement);
    assert.equal(submitted.rows[0].student.correction_opened_at, null);
  } finally { await db.close(); }
});
