// Local-only browser regression. All identity and application network data are mocked.
async (page) => {
  const user={id:'11111111-1111-4111-8111-111111111111',email:'race-test@example.invalid',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
  await page.addInitScript(({user})=>{
    if(sessionStorage.getItem('auth-race-initialized'))return;
    sessionStorage.setItem('auth-race-initialized','1');
    localStorage.setItem('sb-yrzvqvdrahfmmoprgukd-auth-token',JSON.stringify({access_token:'browser-test-token',refresh_token:'browser-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
    localStorage.setItem('elegant-cookie-consent-v1',JSON.stringify({analytics:false,savedAt:new Date().toISOString()}));
  },{user});
  let releaseProfile,started;
  const pendingProfile=new Promise(resolve=>releaseProfile=resolve);
  const profileStarted=new Promise(resolve=>started=resolve);
  await page.route('**/auth/v1/**',route=>route.fulfill({json:{}}));
  await page.route('**/api/**',route=>route.fulfill({json:{vendor:{is_vendor:false}}}));
  await page.route('**/rest/v1/rpc/**',route=>route.fulfill({json:[]}));
  await page.route('**/rest/v1/users*',async route=>{
    started();await pendingProfile;
    await route.fulfill({json:{...user,username:'Old administrator',is_admin:true,is_active:true}});
  });
  await page.goto('http://localhost:3000/admin');
  await profileStarted;
  await page.getByRole('button',{name:'Log Out',exact:true}).click();
  await page.getByRole('link',{name:'Sign In',exact:true}).waitFor();
  const delivered=page.waitForResponse(response=>response.url().includes('/rest/v1/users'));
  releaseProfile();
  await (await delivered).finished();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>!document.querySelector('a[href="/admin"]'));
  if(await page.getByRole('link',{name:'Admin dashboard',exact:true}).count())throw new Error('Stale profile restored admin permission');
  await page.goto('http://localhost:3000/admin');
  await page.getByRole('heading',{name:'Access denied',exact:true}).waitFor();
  console.log('PASS: delayed administrator profile cannot restore permissions after explicit logout.');
}
