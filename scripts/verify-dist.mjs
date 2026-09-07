import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const sw = await readFile('dist/sw.js', 'utf8');
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
const base = process.env.BASE_PATH || '/';
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.ok(html.includes(`${base}assets/`), 'HTML asset paths must use the configured base');
for (const icon of manifest.icons) {
  assert.ok((await stat(`dist/${icon.src}`)).size > 0);
  assert.ok(sw.includes(icon.src), `Missing precached icon: ${icon.src}`);
}
const pictures = await readdir('dist/assets/puzzles');
for (const picture of pictures) {
  assert.ok(sw.includes(`assets/puzzles/${picture}`), `Missing offline picture: ${picture}`);
}
for (const file of await readdir('dist/assets')) {
  if (/\.(css|js|woff2?)$/.test(file)) {
    assert.ok(sw.includes(`assets/${file}`), `Missing offline app asset: ${file}`);
  }
}
console.log(
  `Verified ${pictures.length} offline puzzles, app assets, fonts and PWA icons at base ${base}`,
);
