// ساخت تصویرهای پیش‌نمایش لینک (public/og.png و public/og/<id>.png) و آیکون‌های PNG (public/icons/)
// از روی همان تصویرسازی SVG بازی، با کروم بی‌سر (headless). فقط ابزار توسعه است؛ خروجی‌ها commit می‌شوند.
//
//   node scripts/render-og.mjs            همه‌ی مرحله‌ها + og.png + آیکون‌ها
//   node scripts/render-og.mjs tea fog    فقط همین مرحله‌ها
//
// مسیر کروم را با متغیر CHROME هم می‌شود داد.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { ROOT } from '../server/config.js';
import { LEVELS } from '../public/js/levels.js';

const PUBLIC = join(ROOT, 'public');
const only = process.argv.slice(2);
const ids = only.length ? LEVELS.filter((l) => only.includes(l.id)).map((l) => l.id) : LEVELS.map((l) => l.id);
const full = !only.length;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };

function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [bin]).toString().trim();
    } catch { /* next */ }
  }
  throw new Error('کروم پیدا نشد؛ مسیرش را در متغیر CHROME بدهید.');
}

// صفحه‌ای که در مرورگر همه‌ی تصویرها را می‌سازد و برای این اسکریپت می‌فرستد
const PAGE = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/style.css"></head><body>
<script type="module">
import { renderOg } from '/js/share.js';
import { LEVELS } from '/js/levels.js';
const ids = ${JSON.stringify(ids)};
const save = (name, blob) => fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
const log = (msg) => fetch('/__log', { method: 'POST', body: String(msg) });
try {
  for (const id of ids) await save('og/' + id + '.png', await renderOg(LEVELS.find((l) => l.id === id)));
  if (${full}) {
    await save('og.png', await renderOg(null, LEVELS.length));
    const svg = new Image();
    svg.src = '/favicon.svg';
    await svg.decode();
    const icon = async (name, size, { bleed = false, scale = 1 } = {}) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      if (bleed) { ctx.fillStyle = '#F5EEDF'; ctx.fillRect(0, 0, size, size); }
      const s = size * scale;
      ctx.drawImage(svg, (size - s) / 2, (size - s) / 2, s, s);
      await save('icons/' + name, await new Promise((r) => c.toBlob(r, 'image/png')));
    };
    await icon('favicon-32.png', 32);
    await icon('apple-touch-icon.png', 180, { bleed: true });
    await icon('icon-192.png', 192);
    await icon('icon-512.png', 512);
    // نسخه‌ی maskable: پس‌زمینه تا لبه و طرح داخل «منطقه‌ی امن» ۸۰٪ وسط
    await icon('maskable-512.png', 512, { bleed: true, scale: 0.72 });
  }
  await fetch('/__done', { method: 'POST' });
} catch (err) {
  await log('خطا: ' + (err && err.stack || err));
  await fetch('/__done', { method: 'POST' });
}
</script></body></html>`;

let finish;
const done = new Promise((r) => { finish = r; });
const written = [];

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const body = async () => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return Buffer.concat(chunks);
  };
  if (url.pathname === '/__render') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  if (url.pathname === '/__save') {
    const name = url.searchParams.get('name');
    const file = normalize(join(PUBLIC, name));
    if (!file.startsWith(PUBLIC) || extname(file) !== '.png') return res.writeHead(400).end();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, await body());
    written.push(name);
    console.log('✓', name);
    return res.writeHead(204).end();
  }
  if (url.pathname === '/__log') {
    console.error(String(await body()));
    return res.writeHead(204).end();
  }
  if (url.pathname === '/__done') {
    res.writeHead(204).end();
    return finish();
  }
  const file = normalize(join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'og-chrome-'));
const chrome = spawn(findChrome(), [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=0',
  `http://127.0.0.1:${port}/__render`,
], { stdio: 'ignore' });

const timeout = setTimeout(() => {
  console.error('زمان تمام شد.');
  finish();
}, 180_000);
await done;
clearTimeout(timeout);
chrome.kill();
server.close();
await rm(profile, { recursive: true, force: true }).catch(() => {});
console.log(`${written.length} فایل ساخته شد.`);
if (!written.length) process.exitCode = 1;
