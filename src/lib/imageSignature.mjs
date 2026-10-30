const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

export function hasImageSignature(bytes, filename) {
  if (!ArrayBuffer.isView(bytes) || bytes.BYTES_PER_ELEMENT !== 1 || bytes.length < 12) return false;
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return startsWith(bytes, JPEG);
  if (extension === '.png') return startsWith(bytes, PNG);
  if (extension === '.webp') {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]);
  }
  if (extension === '.heic' || extension === '.heif') {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    return startsWith(bytes.subarray(4), [0x66, 0x74, 0x79, 0x70]) &&
      ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand);
  }
  return false;
}
