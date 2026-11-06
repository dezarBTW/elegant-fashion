// Run after dashboard-loading.browser.cjs in the same mocked local browser session.
async (page) => {
  const order={id:'33333333-3333-4333-8333-333333333333',customer_name:'Offline test customer',customer_email:'customer@example.invalid',customer_phone:'08000000000',payment_status:'paid',fulfillment_status:'new',created_at:new Date().toISOString(),paid_at:new Date().toISOString(),delivery:{method:'pickup'},items:[{productId:'22222222-2222-4222-8222-222222222222',name:'Test occasion gown',size:'M',quantity:1,unitAmountMinor:1000000,lineAmountMinor:1000000,owner:{kind:'vendor',email:'vendor@example.invalid'}}],subtotal_minor:1000000,shipping_minor:0,total_minor:1000000};
  let writes=0;
  await page.route('**/api/admin/orders*',async route=>{
    if(route.request().method()==='PATCH') {
      const body=route.request().postDataJSON();
      if(body.action!=='delivery_completed'||body.expected_status!=='new'||body.note.length<10)throw new Error('Incorrect delivery confirmation payload');
      writes++;order.fulfillment_status='completed';order.delivery_confirmed_at=new Date().toISOString();
      return route.fulfill({json:{order,changed:true,customerEmailSent:true}});
    }
    return route.fulfill({json:{orders:[order],total:1,page:1,pageSize:25}});
  });
  await page.goto('http://localhost:3000/admin/orders');
  const button=page.getByRole('button',{name:'Delivery completed',exact:true});
  await button.waitFor();
  if(!await button.isDisabled())throw new Error('Delivery can be confirmed without evidence');
  if(await page.getByRole('link',{name:'Seller fulfilment & payments',exact:true}).count())throw new Error('Retired navigation remains');
  await page.getByLabel('How was delivery verified?').fill('Verified directly with the customer by phone.');
  await button.click();
  await page.getByText('Delivery completed.',{exact:true}).waitFor();
  if(writes!==1)throw new Error('Duplicate delivery write');
  if(await button.count())throw new Error('Confirmation can restart the return window');
  await page.getByText('View order details',{exact:true}).click();
  await page.getByText('vendor@example.invalid',{exact:true}).waitFor();
  console.log('PASS: admin offline delivery evidence, ownership, and completed state. No live writes.');
}
