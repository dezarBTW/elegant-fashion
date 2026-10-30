import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { accountActionSchema } from '../src/lib/accountContracts.mjs';
import { deactivationEmail, hasGoogleIdentity, hashDeactivationCode, sendDeactivationCode } from '../src/lib/accountDeactivation.mjs';
import { OrderRequestError } from '../src/lib/orderManagement.mjs';

const origin = 'https://fixture.example.invalid';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.invalid' };

async function moduleAt(file, deps) {
  const context = vm.createContext({ Request, Response, URL, console: { error() {} } });
  const source = new vm.SourceTextModule(await readFile(file, 'utf8'), { context });
  await source.link(name => {
    if (!deps[name]) throw new Error(`Missing mock: ${name}`);
    return new vm.SyntheticModule(Object.keys(deps[name]), function () {
      for (const [key, value] of Object.entries(deps[name])) this.setExport(key, value);
    }, { context });
  });
  await source.evaluate();
  return source.namespace;
}

function request(path, body, requestOrigin = origin) {
  return new Request(origin + path, {
    method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('Google identity is checked on the server and code hashes never contain the code', async () => {
  const db = { auth: { admin: { getUserById: async id => ({ data: {
    user: { id, identities: [{ provider: 'google' }] },
  } }) } } };
  assert.equal(await hasGoogleIdentity(db, user.id), true);
  db.auth.admin.getUserById = async () => ({ data: { user: { identities: [{ provider: 'email' }] } } });
  assert.equal(await hasGoogleIdentity(db, user.id), false);
  const hash = hashDeactivationCode(user.id, '001234', 'fixture-secret');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, hashDeactivationCode(user.id, '001235', 'fixture-secret'));
  assert.notEqual(hash, hashDeactivationCode('other-user', '001234', 'fixture-secret'));
  assert.ok(!hash.includes('001234'));
  assert.match(deactivationEmail(user.email, '001234', 'unique').text, /001234.*10 minutes/);
});

test('issued code is stored as a hash, emailed to the owner, and removed if delivery fails', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  const previousSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const writes = [], removals = [], emails = [];
  let failDelivery = false;
  const db = { from: () => ({
    upsert: async row => { writes.push(row); return { error: null }; },
    delete: () => ({ eq(name, value) {
      removals.push([name, value]);
      return removals.length % 2 ? this : Promise.resolve({ error: null });
    } }),
  }) };
  try {
    process.env.RESEND_API_KEY = 'fixture-api-key';
    process.env.RESEND_FROM_EMAIL = 'fixture@example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-key';
    globalThis.fetch = async (_url, options) => {
      emails.push(JSON.parse(options.body));
      return new Response(null, { status: failDelivery ? 400 : 200 });
    };
    assert.equal(await sendDeactivationCode(db, user), true);
    assert.equal(writes[0].user_id, user.id);
    assert.match(writes[0].code_hash, /^[a-f0-9]{64}$/);
    assert.ok(new Date(writes[0].expires_at).getTime() > Date.now());
    assert.match(emails[0].text, /\b\d{6}\b/);
    assert.ok(!writes[0].code_hash.includes(emails[0].text.match(/\b\d{6}\b/)[0]));
    failDelivery = true;
    assert.equal(await sendDeactivationCode(db, user), false);
    assert.deepEqual(removals.map(([name]) => name), ['user_id', 'code_hash']);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name, previous] of [['RESEND_API_KEY', previousKey], ['RESEND_FROM_EMAIL', previousSender], ['SUPABASE_SERVICE_ROLE_KEY', previousSecret]]) {
      if (previous === undefined) delete process.env[name]; else process.env[name] = previous;
    }
  }
});

test('code request requires same origin, a Google identity, and a server rate limit', async () => {
  let google = true, allowed = true, sent = 0;
  const db = { rpc: async () => ({ data: allowed }) };
  const route = await moduleAt('src/app/api/account/deactivation/route.js', {
    'next/server': { NextResponse: Response },
    '@/lib/accountServer': {
      checkRequestOrigin(req) { if (req.headers.get('origin') !== origin) throw new OrderRequestError('Invalid origin', 403); },
      requireActiveAccount: async () => ({ db, user }),
    },
    '@/lib/accountDeactivation.mjs': {
      hasGoogleIdentity: async () => google,
      sendDeactivationCode: async () => { sent++; return true; },
    },
    '@/lib/orderManagement.mjs': { OrderRequestError },
  });
  const method = await route.GET(new Request(origin + '/api/account/deactivation'));
  assert.equal((await method.json()).method, 'email-code');
  assert.equal(method.headers.get('cache-control'), 'private, no-store');
  assert.equal((await route.POST(request('/api/account/deactivation', undefined, 'https://evil.invalid'))).status, 403);
  google = false;
  assert.equal((await route.POST(request('/api/account/deactivation'))).status, 403);
  google = true; allowed = false;
  assert.equal((await route.POST(request('/api/account/deactivation'))).status, 429);
  allowed = true;
  assert.equal((await route.POST(request('/api/account/deactivation'))).status, 200);
  assert.equal(sent, 1);
});

test('code deactivation consumes a code without a password and rejects invalid or non-Google attempts', async () => {
  let google = true, valid = true, allowed = true, updates = 0, passwordCalls = 0, revocations = 0;
  const actions = [];
  const db = {
    rpc: async (name, args) => {
      actions.push([name, args]);
      return { data: name === 'consume_account_deactivation_code' ? valid : allowed };
    },
    from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => {
      updates++; return { data: { id: user.id } };
    } }) }) }) }),
    auth: { admin: { signOut: async () => { revocations++; return {}; } } },
  };
  const route = await moduleAt('src/app/api/account/route.js', {
    'next/server': { NextResponse: Response },
    '@/lib/accountContracts.mjs': { accountActionSchema },
    '@/lib/accountServer': {
      requireActiveAccount: async () => ({ db, user, token: 'fixture-token' }),
      readAccountBody: async (req, schema) => {
        if (req.headers.get('origin') !== origin) throw new OrderRequestError('Invalid origin', 403);
        const result = schema.safeParse(await req.json());
        if (!result.success) throw new OrderRequestError('Invalid body', 400);
        return result.data;
      },
      passwordClient: () => { passwordCalls++; throw new Error('Password flow should not run'); },
    },
    '@/lib/accountDeactivation.mjs': { hasGoogleIdentity: async () => google, hashDeactivationCode: () => 'fixture-hash' },
    '@/lib/orderManagement.mjs': { OrderRequestError },
  });
  const submit = () => route.POST(request('/api/account', { action: 'deactivate_code', code: '001234', confirmed: true }));
  google = false;
  assert.equal((await submit()).status, 403); assert.equal(actions.length, 0);
  google = true; valid = false;
  assert.equal((await submit()).status, 400); assert.equal(updates, 0);
  valid = true; allowed = false;
  assert.equal((await submit()).status, 429); assert.equal(updates, 0);
  allowed = true;
  const response = await submit();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).deactivated, true);
  assert.equal(updates, 1);
  assert.equal(revocations, 1);
  assert.equal(passwordCalls, 0);
  assert.ok(actions.some(([name, args]) => name === 'consume_account_deactivation_code' && args.p_user_id === user.id && args.p_code_hash === 'fixture-hash'));
});

test('password accounts still confirm deactivation with their current password', async () => {
  let passwordChecks = 0, updates = 0;
  const db = {
    rpc: async (_name, args) => {
      assert.equal(args.p_action, 'deactivate');
      return { data: true };
    },
    from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => {
      updates++; return { data: { id: user.id } };
    } }) }) }) }),
    auth: { admin: { signOut: async () => ({}) } },
  };
  const route = await moduleAt('src/app/api/account/route.js', {
    'next/server': { NextResponse: Response },
    '@/lib/accountContracts.mjs': { accountActionSchema },
    '@/lib/accountServer': {
      requireActiveAccount: async () => ({ db, user, token: 'fixture-token' }),
      readAccountBody: async (req, schema) => schema.parse(await req.json()),
      passwordClient: () => ({ auth: {
        signInWithPassword: async credentials => {
          passwordChecks++;
          assert.equal(credentials.password, 'current-password');
          return { data: { user }, error: null };
        },
        signOut: async () => ({}),
      } }),
    },
    '@/lib/accountDeactivation.mjs': { hasGoogleIdentity: () => { throw new Error('Google check must not run'); }, hashDeactivationCode: () => { throw new Error('Code hash must not run'); } },
    '@/lib/orderManagement.mjs': { OrderRequestError },
  });
  const response = await route.POST(request('/api/account', { action: 'deactivate', currentPassword: 'current-password', confirmed: true }));
  assert.equal(response.status, 200);
  assert.equal(passwordChecks, 1);
  assert.equal(updates, 1);
});
