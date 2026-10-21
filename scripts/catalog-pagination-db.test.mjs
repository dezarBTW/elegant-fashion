import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE_PATH;
const migration = await readFile(new URL('../supabase/migrations/20261021225647_catalog_pagination_rls_performance.sql', import.meta.url), 'utf8');
const cleanup = await readFile(new URL('../supabase/migrations/20261021230048_consolidate_remaining_rls_policies.sql', import.meta.url), 'utf8');
const policies = [...JSON.parse(await readFile(new URL('./fixtures/catalog-policies-before.json', import.meta.url), 'utf8')), ...JSON.parse(await readFile(new URL('./fixtures/catalog-related-policies-before.json', import.meta.url), 'utf8'))];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const ids = { alice: '11111111-1111-4111-8111-111111111111', bob: '22222222-2222-4222-8222-222222222222', admin: '33333333-3333-4333-8333-333333333333', inactive: '44444444-4444-4444-8444-444444444444', inactiveAdmin: '55555555-5555-4555-8555-555555555555' };

test('bounded catalog pages and equivalent RLS permissions', { skip: !modulePath && 'Set PGLITE_MODULE_PATH for isolated SQL checks' }, async t => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE users(id uuid PRIMARY KEY,email text,is_admin boolean,is_active boolean);
      CREATE TABLE students(id bigint PRIMARY KEY,user_id uuid,accepted boolean);
      CREATE TABLE products(id uuid PRIMARY KEY,slug text,name text,category text,gender text,description text,price numeric,sale_price numeric,image text,available_sizes text[],specifications jsonb,is_active boolean,created_at timestamptz);
      CREATE TABLE product_size_stock(product_id uuid PRIMARY KEY REFERENCES products(id),quantities jsonb,revision bigint);
      CREATE TABLE categories(id integer PRIMARY KEY,is_active boolean);
      CREATE TABLE product_categories(product_id uuid);
      CREATE TABLE product_images(id integer PRIMARY KEY,product_id uuid);
      CREATE TABLE product_variants(id integer PRIMARY KEY,product_id uuid,is_active boolean);
      CREATE FUNCTION is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT is_admin AND is_active FROM public.users WHERE id=auth.uid()),false)$$;
      CREATE FUNCTION is_active_account() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.users WHERE id=(SELECT auth.uid()) AND is_active IS TRUE)$$;
      CREATE FUNCTION is_active_account_admin() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.users WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND is_admin IS TRUE)$$;
      ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      ALTER TABLE products ENABLE ROW LEVEL SECURITY; ALTER TABLE product_size_stock ENABLE ROW LEVEL SECURITY;
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY; ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE product_images ENABLE ROW LEVEL SECURITY; ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON categories,product_categories,product_images,product_variants TO anon,authenticated;
      GRANT INSERT,UPDATE,DELETE ON categories,product_categories,product_images,product_variants TO authenticated;
      GRANT SELECT,INSERT,UPDATE ON users TO authenticated;
      GRANT SELECT ON students,product_size_stock TO authenticated;
      GRANT SELECT ON products TO anon,authenticated;
      GRANT INSERT,UPDATE,DELETE ON products TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
    for (const p of policies) {
      const roles = p.roles.slice(1, -1).split(',').map(quote).join(',');
      await db.exec(`CREATE POLICY ${quote(p.policyname)} ON ${quote(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${roles}${p.qual ? ' USING (' + p.qual + ')' : ''}${p.with_check ? ' WITH CHECK (' + p.with_check + ')' : ''}`);
    }
    for (const [name, id] of Object.entries(ids)) {
      await db.query('INSERT INTO users VALUES($1,$2,$3,$4)', [id, name + '@example.invalid', ['admin', 'inactiveAdmin'].includes(name), !name.startsWith('inactive')]);
      await db.query('INSERT INTO students VALUES($1,$2,false)', [Object.keys(ids).indexOf(name) + 1, id]);
    }
    await db.exec(`INSERT INTO products SELECT md5(n::text)::uuid,'piece-'||n,CASE WHEN n=1205 THEN 'Unique %_ (tailor),' ELSE 'Piece '||n END,
      CASE WHEN n%2=0 THEN 'Skirts' ELSE 'Dresses' END,
      CASE n%3 WHEN 0 THEN 'unisex' WHEN 1 THEN 'male' ELSE 'female' END,
      'Cotton tailoring',CASE n%3 WHEN 0 THEN 40000 WHEN 1 THEN 60000 ELSE 60001 END,NULL,NULL,ARRAY['L'],
      '{"fabric":"silk"}',n%10<>0,'2026-01-01'::timestamptz FROM generate_series(1,1205) n;
      INSERT INTO product_size_stock SELECT id,'{"S":0,"M":0,"L":4,"XL":0,"XXL":0}',7 FROM products;
      INSERT INTO categories VALUES(1,true),(2,false);
      INSERT INTO product_categories SELECT id FROM products;
      INSERT INTO product_images SELECT row_number() OVER()::int,id FROM products;
      INSERT INTO product_variants SELECT row_number() OVER()::int,id,false FROM products;`);
    const as = async (role, user, sql, params = []) => {
      await db.exec('BEGIN');
      try {
        await db.exec('SET LOCAL ROLE ' + role);
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user || '']);
        return await db.query(sql, params);
      } finally { await db.exec('ROLLBACK'); }
    };
    const visibility = async () => {
      const matrix = {};
      for (const [name, id] of Object.entries({ guest: null, ...ids })) {
        matrix[name] = {};
        for (const table of ['users', 'students', 'products', 'product_size_stock','categories','product_categories','product_images','product_variants']) {
          try { matrix[name][table] = (await as(name === 'guest' ? 'anon' : 'authenticated', id, 'SELECT count(*)::int n FROM ' + table)).rows[0].n; }
          catch (error) { if (error.code !== '42501') throw error; matrix[name][table] = 'denied'; }
        }
      }
      return matrix;
    };
    const before = await visibility();
    await db.exec(migration);
    await db.exec(cleanup);
    await t.test('guest, owner, other customer, active/inactive admin retain identical row access', async () => {
      assert.deepEqual(await visibility(), before);
      for (const user of [ids.alice,ids.bob]) {
        assert.deepEqual((await as('authenticated',user,'SELECT id FROM users')).rows.map(row=>row.id),[user]);
        assert.deepEqual((await as('authenticated',user,'SELECT user_id FROM students')).rows.map(row=>row.user_id),[user]);
      }
    });
    const shop = async (page = 1, search = '', category = 'All', price = 'all', gender = 'all', role = 'anon', user = null) =>
      (await as(role, user, 'SELECT get_shop_product_page($1,$2,$3,$4,$5) result', [page, search, category, price, gender])).rows[0].result;
    const admin = async (page = 1, search = '', category = 'All', user = ids.admin) =>
      (await as('authenticated', user, 'SELECT get_admin_product_page($1,$2,$3) result', [page, search, category])).rows[0].result;
    await t.test('public pagination reaches every active product beyond 1,000, without duplicates at tied timestamps', async () => {
      const first = await shop(); assert.equal(first.total, 1085); assert.equal(first.products.length, 12);
      const seen = new Set();
      for (let page = 1; page <= Math.ceil(first.total / 12); page++) {
        const result = await shop(page);
        for (const product of result.products) { assert.ok(!seen.has(product.id)); seen.add(product.id); assert.ok(!('stock' in product)); assert.ok(!('specifications' in product)); }
      }
      assert.equal(seen.size, first.total);
    });
    await t.test('search, price boundaries, category and unisex filters apply before pagination', async () => {
      const result = await shop(1, 'silk', 'Skirts', 'low', 'female');
      const expected = (await db.query("SELECT count(*)::int n FROM products WHERE is_active AND category='Skirts' AND price<=40000 AND gender IN ('female','unisex')")).rows[0].n;
      assert.equal(result.total, expected); assert.equal(result.products.length, 12);
      assert.equal((await shop(1, '%_ (tailor),')).total, 1);
      assert.equal((await shop(1, "' OR true --")).total, 0);
      assert.equal((await shop(1, 'unfindable')).products.length, 0);
      const medium = await shop(1, '', 'All', 'medium'); assert.ok(medium.products.every(p => p.price > 40000 && p.price <= 60000));
      const high = await shop(1, '', 'All', 'high'); assert.ok(high.products.every(p => p.price > 60000));
    });
    await t.test('admin pages return at most 24 products with the correct stock and revision, including beyond 1,000', async () => {
      const result = await admin(43); assert.equal(result.total, 1205); assert.equal(result.products.length, 24);
      for (const product of result.products) { assert.equal(product.stock.quantities.L, 4); assert.equal(product.stock.revision, 7); }
      assert.deepEqual(result.categories, ['Dresses', 'Skirts']);
      const filtered = await admin(1, 'Unique', 'Dresses'); assert.equal(filtered.total, 1); assert.equal(filtered.products[0].name, 'Unique %_ (tailor),');
    });
    await t.test('out-of-range pages clamp after deletions and empty results return page 1', async () => {
      assert.equal((await shop(100000)).page, 91);
      assert.equal((await admin(100000)).page, 51);
      assert.equal((await admin(100, 'unfindable')).page, 1);
    });
    await t.test('ordinary and inactive accounts cannot call admin pagination or expose stock', async () => {
      for (const id of [ids.alice, ids.inactive, ids.inactiveAdmin]) await assert.rejects(admin(1, '', 'All', id), e => e.code === '42501');
      await assert.rejects(as('anon', null, 'SELECT get_admin_product_page()'), e => e.code === '42501');
      assert.equal((await shop(1, '', 'All', 'all', 'all', 'authenticated', ids.admin)).total, 1085);
    });
    await t.test('filters reject malformed input and profile escalation stays blocked', async () => {
      await assert.rejects(shop(0), e => e.code === '22023');
      await assert.rejects(shop(1, 'x'.repeat(201)), e => e.code === '22023');
      await assert.rejects(shop(1, '', 'All', 'bad'), e => e.code === '22023');
      await assert.rejects(as('authenticated', ids.alice, 'UPDATE users SET is_admin=true WHERE id=$1', [ids.alice]), e => e.code === '42501');
      assert.equal((await as('authenticated', ids.alice, 'UPDATE users SET email=$1 WHERE id=$2 RETURNING id', ['changed@example.invalid', ids.bob])).rows.length, 0);
      assert.equal((await as('authenticated', ids.alice, 'UPDATE products SET price=1 RETURNING id')).rows.length, 0);
      assert.equal((await as('authenticated', ids.admin, 'UPDATE users SET email=$1 WHERE id=$2 RETURNING id', ['admin-change@example.invalid',ids.alice])).rows.length,1);
      assert.equal((await as('authenticated', ids.inactiveAdmin, 'UPDATE users SET email=$1 WHERE id=$2 RETURNING id', ['inactive@example.invalid',ids.alice])).rows.length,0);
      await assert.rejects(as('authenticated',ids.admin,'UPDATE students SET accepted=true'),e=>e.code==='42501');
      for (const table of ['categories','product_variants']) {
        assert.equal((await as('authenticated',ids.alice,`UPDATE ${table} SET is_active=true RETURNING id`)).rows.length,0);
        assert.equal((await as('authenticated',ids.admin,`UPDATE ${table} SET is_active=true RETURNING id`)).rows.length,table==='categories'?2:1205);
      }
    });
    await t.test('authenticated product plan uses an InitPlan for administrator checks', async () => {
      const plan = await as('authenticated', ids.alice, 'EXPLAIN SELECT id FROM products WHERE is_active ORDER BY created_at DESC,id ASC LIMIT 12');
      assert.match(plan.rows.map(r => r['QUERY PLAN']).join('\n'), /InitPlan/);
    });
  } finally { await db.close(); }
});
