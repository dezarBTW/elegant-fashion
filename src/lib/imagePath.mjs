// The image optimizer expects local filenames, rather than encoded path segments.
export function imagePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/images/')) return value;
  try { return decodeURIComponent(value); } catch { return value; }
}
