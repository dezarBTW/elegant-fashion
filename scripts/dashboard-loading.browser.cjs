// Run with a local server: playwright-cli run-code --filename scripts/dashboard-loading.browser.cjs
// All identities, profile reads, dashboard data and order actions are mocked.
async (page) => {
  const user={id:'11111111-1111-4111-8111-111111111111',email:'browser-test@example.invalid',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
  await page.addInitScript(({user})=>{
    localStorage.setItem('sb-yrzvqvdrahfmmoprgukd-auth-token',JSON.stringify({access_token:'browser-test-token',refresh_token:'browser-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
    localStorage.setItem('elegant-cookie-consent-v1',JSON.stringify({analytics:false,savedAt:new Date().toISOString()}));
  },{user});
  await page.route('**/auth/v1/**',route=>route.fulfill({json:{user}}));
  await page.route('**/rest/v1/users*',route=>route.fulfill({json:{...user,username:'Browser test',is_active:true,is_admin:true,is_vendor:true}}));
  await page.route('**/api/account/vendor',route=>route.fulfill({json:{vendor:{is_vendor:true}}}));
  let releaseStats,releaseProfile;
  const statsReady=new Promise(resolve=>releaseStats=resolve);
  const profileReady=new Promise(resolve=>releaseProfile=resolve);
  await page.route('**/rest/v1/rpc/get_admin_overview',async route=>{await statsReady;await route.fulfill({json:{newBespoke:2,totalBespoke:3,pendingStudents:4,acceptedStudents:5,products:6}});});
  await page.route('**/api/account/deactivation',async route=>{await profileReady;await route.fulfill({json:{method:'password'}});});
  await page.goto('http://localhost:3000/admin');
  await page.getByRole('status',{name:'Loading admin dashboard',exact:true}).waitFor();
  await page.screenshot({path:'output/admin-dashboard-skeleton.png'});
  releaseStats();
  await page.getByRole('heading',{name:'Admin overview',exact:true}).waitFor();
  if(await page.getByRole('status',{name:'Loading admin dashboard',exact:true}).count())throw new Error('Dashboard loader stuck');
  await page.goto('http://localhost:3000/account');
  await page.getByRole('status',{name:'Loading your profile',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/profile-skeleton-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Profile skeleton overflows mobile');
  releaseProfile();
  await page.getByRole('heading',{name:'Your profile',exact:true}).waitFor();
  const item={id:'22222222-2222-4222-8222-222222222222',product_name:'Test occasion gown',seller_kind:'vendor',seller_id:user.id,order_id:'33333333-3333-4333-8333-333333333333',size:'M',quantity:1,fulfilment:'completed',confirmed_at:'2026-11-01T10:00:00Z',payment_marked_at:null,payment_received_at:null,line_amount_minor:1000000,order:{id:'33333333-3333-4333-8333-333333333333',delivery:{method:'yenagoa'},customer_name:'Test customer',customer_email:'customer@example.invalid',customer_phone:'08000000000'}};
  await page.route('**/api/account/seller-orders*',route=>{
    if(route.request().method()!=='GET')throw new Error('Sales history must not write');
    return route.fulfill({json:{items:[{...item,paid_at:new Date().toISOString()}]}});
  });
  await page.goto('http://localhost:3000/account/vendor-orders');
  await page.getByRole('heading',{name:item.product_name,exact:true}).waitFor();
  if(await page.getByRole('button',{name:/payment received|payment fulfilled|shipped|processing/i}).count())throw new Error('Retired seller action still visible');
  if(await page.getByText('customer@example.invalid',{exact:false}).count())throw new Error('Sales history exposed customer contact details');
  console.log('PASS: dashboard/profile skeletons and read-only vendor sales history.');
}
