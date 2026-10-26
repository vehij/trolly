import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../server/index.js';
import { originFor, metaTags } from '../server/meta.js';
import { ROOT } from '../server/config.js';
import { LEVELS } from '../public/js/levels.js';

let server;
let port;

before(async () => {
  server = createApp({ dbPath: ':memory:', region: 'ir', startSync: false });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});

after(() => new Promise((r) => server.close(r)));

// fetch اجازه‌ی تغییر هدر Host را نمی‌دهد، پس با node:http درخواست می‌دهیم
function get(path, host, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { Host: host } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

const metaContent = (html, key) => {
  const m = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html);
  return m && m[1];
};

const level = LEVELS[3];

test('صفحه‌ی اول برای هر دامنه آدرس کامل همان دامنه را دارد', async () => {
  for (const host of ['soozanban.com', 'www.soozanban.com', 'souzanbaan.ir', 'www.souzanbaan.ir']) {
    const { status, body } = await get('/', host);
    assert.equal(status, 200);
    assert.equal(metaContent(body, 'og:url'), `https://${host}/`);
    assert.equal(metaContent(body, 'og:image'), `https://${host}/og.png`);
    assert.equal(metaContent(body, 'twitter:image'), `https://${host}/og.png`);
    assert.equal(metaContent(body, 'og:locale'), 'fa_IR');
    assert.equal(metaContent(body, 'og:image:width'), '1200');
    assert.ok(metaContent(body, 'og:site_name'));
    assert.match(body, new RegExp(`<link rel="canonical" href="https://${host.replace(/\./g, '\\.')}/">`));
    assert.equal((body.match(/property="og:url"/g) || []).length, 1, 'تگ تکراری نباید بماند');
  }
});

test('دامنه‌ی ناشناخته به آدرس پیش‌فرض همان منطقه برمی‌گردد', async () => {
  const { body } = await get('/', 'evil.example');
  assert.equal(metaContent(body, 'og:url'), 'https://souzanbaan.ir/');
  assert.doesNotMatch(body, /evil\.example/);
  assert.equal(originFor('evil.example', 'intl'), 'https://soozanban.com');
  assert.equal(originFor('evil.example', 'main'), 'https://soozanban.com');
  assert.equal(originFor('localhost:3000', 'ir'), 'http://localhost:3000');
  assert.equal(originFor('SOOZANBAN.COM', 'ir'), 'https://soozanban.com');
});

test('لینک هر مرحله عنوان، توضیح و تصویر خودش را دارد', async () => {
  const { status, body, headers } = await get(`/l/${level.id}`, 'soozanban.com');
  assert.equal(status, 200);
  assert.match(headers['content-type'], /text\/html/);
  assert.equal(metaContent(body, 'og:url'), `https://soozanban.com/l/${level.id}`);
  assert.ok(metaContent(body, 'og:title').startsWith(level.title));
  assert.match(body, new RegExp(`<title>${level.title}`));
  const hasPng = existsSync(join(ROOT, 'public', 'og', `${level.id}.png`));
  assert.equal(metaContent(body, 'og:image'), `https://soozanban.com/${hasPng ? `og/${level.id}.png` : 'og.png'}`);
  const ir = await get(`/l/${level.id}/`, 'souzanbaan.ir');
  assert.equal(metaContent(ir.body, 'og:url'), `https://souzanbaan.ir/l/${level.id}`);
  assert.ok(metaContent(ir.body, 'og:image').startsWith('https://souzanbaan.ir/'));
});

test('مرحله‌ی بدون تصویر اختصاصی از og.png استفاده می‌کند', () => {
  const html = metaTags({ origin: 'https://soozanban.com', level, hasLevelImage: false });
  assert.match(html, /content="https:\/\/soozanban\.com\/og\.png"/);
});

test('مرحله‌ی ناشناخته به صفحه‌ی اول هدایت می‌شود', async () => {
  const r = await get('/l/no-such-level', 'soozanban.com');
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/');
  assert.equal((await get('/l/%E0%A4%A', 'soozanban.com')).status, 302);
});

test('HEAD و ETag برای صفحه کار می‌کنند و CSP تصویرهای blob را اجازه می‌دهد', async () => {
  const head = await get('/', 'soozanban.com', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(head.headers.etag);
  assert.match(head.headers['content-security-policy'], /img-src 'self' data: blob:/);
  assert.match(head.headers['content-security-policy'], /media-src 'self'/);
  const other = await get('/', 'souzanbaan.ir', 'HEAD');
  assert.notEqual(other.headers.etag, head.headers.etag);
});

test('فایل‌های آیکون و صدای بی‌صدا موجودند', () => {
  for (const f of ['icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/favicon-32.png', 'audio/silence.wav', 'og.png']) {
    assert.ok(existsSync(join(ROOT, 'public', f)), f);
  }
});

test('فایل صوتی درخواست Range را با 206 جواب می‌دهد (لازم برای سافاری)', async () => {
  const full = await get('/audio/silence.wav', 'soozanban.com');
  assert.equal(full.status, 200);
  assert.equal(full.headers['accept-ranges'], 'bytes');
  assert.equal(full.headers['content-type'], 'audio/wav');
  const part = await new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/audio/silence.wav', headers: { Range: 'bytes=0-1' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(part.status, 206);
  assert.match(part.headers['content-range'], /^bytes 0-1\/\d+$/);
  assert.equal(part.body.toString('latin1'), 'RI');
});
