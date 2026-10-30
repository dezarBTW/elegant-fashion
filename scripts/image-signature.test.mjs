import test from 'node:test';
import assert from 'node:assert/strict';
import { hasImageSignature } from '../src/lib/imageSignature.mjs';

test('image signatures must match the supplied extension', () => {
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const heic = Uint8Array.from([0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
  assert.equal(hasImageSignature(jpg, 'passport.jpg'), true);
  assert.equal(hasImageSignature(png, 'passport.png'), true);
  assert.equal(hasImageSignature(webp, 'reference.webp'), true);
  assert.equal(hasImageSignature(heic, 'reference.heic'), true);
  assert.equal(hasImageSignature(png, 'passport.jpg'), false);
  assert.equal(hasImageSignature(new TextEncoder().encode('<script>bad</script>'), 'passport.jpg'), false);
});
