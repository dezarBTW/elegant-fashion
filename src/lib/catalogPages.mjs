async function loadPage(db, name, parameters, signal) {
  const { data, error } = await db.rpc(name, parameters).abortSignal(signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.products) || !Number.isSafeInteger(data.total) || !Number.isSafeInteger(data.page)) {
    throw new Error('Invalid product page response.');
  }
  return data;
}

export function loadShopPage(db, { page, search, category, price, gender }, signal) {
  return loadPage(db, 'get_shop_product_page', {
    p_page: page, p_search: search.trim(), p_category: category,
    p_price: price, p_gender: gender || 'all',
  }, signal);
}

export function loadAdminProductPage(db, { page, search, category }, signal) {
  return loadPage(db, 'get_admin_product_page', {
    p_page: page, p_search: search.trim(), p_category: category,
  }, signal);
}
