async (page) => {
  const posts = [];
  await page.route('**/api/checkout/orders/*/received', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') throw new Error('Receipt mutation must use POST.');
    posts.push(request.postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ confirmed: true, receivedAt: '2026-10-17T12:00:00Z' }) });
  });
  const dismiss = page.getByRole('button', { name: 'Reject non-essential' });
  if (await dismiss.isVisible()) await dismiss.click();
  const button = page.getByRole('button', { name: 'I have received the product', exact: true });
  if (!await button.isDisabled()) throw new Error('Confirmation must require explicit agreement.');
  if (posts.length) throw new Error('Opening a link must not confirm receipt.');
  await page.getByRole('checkbox', { name: 'I confirm that I have received every product in this order.' }).check();
  await button.click();
  await page.getByRole('heading', { name: 'Receipt confirmed', exact: true }).waitFor();
  if (posts.length !== 1 || posts[0].confirmed !== true || posts[0].token !== 'e'.repeat(64)) throw new Error('Unexpected confirmation payload.');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile page overflows.');
  if (await page.locator('meta[name="referrer"]').getAttribute('content') !== 'no-referrer') throw new Error('Missing referrer protection.');
  await page.screenshot({ path: 'output/playwright/order-received-success-mobile.png', fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Have you received your order?' }).waitFor();
  if (posts.length !== 1) throw new Error('Reopening the link submitted a confirmation.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'output/playwright/order-received-desktop.png' });
  await page.setViewportSize({ width: 320, height: 568 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Small mobile page overflows.');
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page.getByRole('checkbox', { name: 'I confirm that I have received every product in this order.' }).check();
  await button.click();
  await page.getByRole('alert').filter({ hasText: 'Open the personal confirmation link' }).waitFor();
  if (posts.length !== 1) throw new Error('Missing token reached the server.');
  console.log('Browser checks passed: explicit agreement, correct payload, success view, safe reopening, missing-token rejection, no-referrer, and responsive layouts.');
}
