import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { optimizeProductImage } from '../src/lib/optimizeProductImage.mjs';

test('product uploads become bounded WebP without cropping or losing transparency', async () => {
  const original = await sharp({ create: { width: 2400, height: 3600, channels: 4, background: { r: 50, g: 100, b: 150, alpha: .5 } } }).png().toBuffer();
  const result = await optimizeProductImage(new File([original], 'dress.png', { type: 'image/png' }));
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.height, 1600);
  assert.ok(Math.abs(metadata.width / metadata.height - 2 / 3) < .001);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.exif, undefined);
});

test('orientation is applied and small images are never enlarged', async () => {
  const original = await sharp({ create: { width: 120, height: 80, channels: 3, background: 'gold' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await optimizeProductImage(new File([original], 'dress.jpg', { type: 'image/jpeg' }));
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 80);
  assert.equal(metadata.height, 120);
  assert.equal(metadata.orientation, undefined);
});

test('invalid, disguised and undecodable images are rejected', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'white' } }).png().toBuffer();
  for (const file of [null, new File([png], 'fake.jpg', { type: 'image/jpeg' }), new File([png.subarray(0, 20)], 'broken.png', { type: 'image/png' })]) {
    await assert.rejects(optimizeProductImage(file), error => error.status === 400);
  }
});

test('representative hero photo is smaller after upload conversion', async () => {
  const original = await readFile(new URL('../public/images/Hero/image%20(20).jpg', import.meta.url));
  const result = await optimizeProductImage(new File([original], 'dress.jpg', { type: 'image/jpeg' }));
  assert.ok(result.length < original.length);
  console.log(`Photo conversion: ${original.length} → ${result.length} bytes (${Math.round((1-result.length/original.length)*100)}% smaller)`);
});
