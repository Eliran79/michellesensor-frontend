// Fails if any local href/src in the site's HTML points to a file that does not exist.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const htmlFiles = [
  ...readdirSync(root).filter((f) => f.endsWith('.html')),
  ...(existsSync(join(root, 'include'))
    ? readdirSync(join(root, 'include')).filter((f) => f.endsWith('.html')).map((f) => `include/${f}`)
    : []),
];

// Includes are injected into top-level pages, so their links resolve from the site root.
const baseFor = (file) => (file.startsWith('include/') ? root : dirname(join(root, file)));

const attr = /\s(?:href|src)\s*=\s*"([^"]+)"/gi;
const missing = [];

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  for (const [, attrValue] of html.matchAll(attr)) {
    const raw = attrValue.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (/^(?:[a-z]+:|\/\/|#)/i.test(raw) || raw.includes('${')) continue;
    const path = raw.split(/[?#]/)[0];
    if (!path) continue;
    const candidates = [path];
    try { candidates.push(decodeURIComponent(path)); } catch { /* keep raw */ }
    if (!candidates.some((p) => existsSync(join(baseFor(file), p)))) missing.push(`${file}: ${raw}`);
  }
}

if (missing.length) {
  console.error(`Broken local links (${missing.length}):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML files: all local links resolve.`);
