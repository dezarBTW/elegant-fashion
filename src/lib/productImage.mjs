export function validateProductImage(file) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file?.type];
  if (!extension) return { valid: false, message: 'Choose a JPEG, PNG or WebP image.' };
  if (file.size < 12 || file.size > 4000000) return { valid: false, message: 'Choose an image under 4 MB.' };
  return { valid: true, extension };
}
