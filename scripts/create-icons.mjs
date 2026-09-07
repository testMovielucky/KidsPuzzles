import sharp from 'sharp';
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['icon-maskable.png', 512],
]) {
  await sharp('public/icon.svg')
    .resize(size, size)
    .flatten({ background: '#6d6bd1' })
    .png()
    .toFile(`public/${name}`);
}
