import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE_PATH;
const migration = await readFile(new URL('../supabase/migrations/20261030180000_google_deactivation_codes.sql', import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const hash = 'a'.repeat(64);

test('deactivation codes are one-time, limited, and inaccessible to browser roles', {
  skip: !modulePath && 'Set PGLITE_MODULE_PATH to run isolated SQL checks.',
}, async () => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      CREATE TABLE public.account_action_limits (
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        action text NOT NULL, window_started_at timestamptz NOT NULL,
        request_count integer NOT NULL, PRIMARY KEY (user_id, action)
      );
      GRANT ALL ON public.account_action_limits TO service_role;
    `);
    await db.query('INSERT INTO auth.users (id) VALUES ($1)', [owner]);
    await db.exec(migration);
    await db.exec(migration);

    async function asRole(role, action) {
      await db.exec(`SET ROLE ${role}`);
      try { return await action(); } finally { await db.exec('RESET ROLE'); }
    }
    async function consume(codeHash) {
      return asRole('service_role', async () => (await db.query(
        'SELECT public.consume_account_deactivation_code($1,$2) AS valid', [owner, codeHash],
      )).rows[0].valid);
    }

    await asRole('service_role', () => db.query(
      "INSERT INTO public.account_deactivation_codes (user_id,code_hash,expires_at) VALUES ($1,$2,now()+interval '10 minutes')",
      [owner, hash],
    ));
    for (const role of ['anon', 'authenticated']) {
      await asRole(role, async () => {
        await assert.rejects(db.query('SELECT * FROM public.account_deactivation_codes'), { code: '42501' });
        await assert.rejects(db.query('SELECT public.consume_account_deactivation_code($1,$2)', [owner, hash]), { code: '42501' });
      });
    }
    assert.equal(await consume('b'.repeat(64)), false);
    assert.equal(await consume(hash), true);
    assert.equal(await consume(hash), false);

    await asRole('service_role', () => db.query(
      "INSERT INTO public.account_deactivation_codes (user_id,code_hash,expires_at) VALUES ($1,$2,now()-interval '1 second')",
      [owner, hash],
    ));
    assert.equal(await consume(hash), false);

    await asRole('service_role', () => db.query(
      "INSERT INTO public.account_deactivation_codes (user_id,code_hash,expires_at) VALUES ($1,$2,now()+interval '10 minutes')",
      [owner, hash],
    ));
    for (let i = 0; i < 5; i++) assert.equal(await consume('b'.repeat(64)), false);
    assert.equal(await consume(hash), false);
    await asRole('service_role', async () => {
      const attempt = action => db.query('SELECT public.consume_account_action_limit($1,$2) AS allowed', [owner, action]);
      for (let i = 0; i < 3; i++) assert.equal((await attempt('deactivate_code_send')).rows[0].allowed, true);
      assert.equal((await attempt('deactivate_code_send')).rows[0].allowed, false);
      for (let i = 0; i < 5; i++) assert.equal((await attempt('deactivate_code_verify')).rows[0].allowed, true);
      assert.equal((await attempt('deactivate_code_verify')).rows[0].allowed, false);
    });
  } finally { await db.close(); }
});
