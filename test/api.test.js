import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';

let server;
let base;

before(async () => {
  server = createApp({ dbPath: ':memory:', voteLimit: 1000 });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

const vote = (body) =>
  fetch(`${base}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('رأی ثبت می‌شود و آمار برمی‌گردد', async () => {
  const res = await vote({ session: 'session-aaaa', level: 'original', choice: 'pull' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { level: 'original', pull: 1, stay: 0 });
});

test('هر نشست فقط یک رأی در هر مرحله دارد و می‌تواند نظرش را عوض کند', async () => {
  await vote({ session: 'session-bbbb', level: 'four', choice: 'pull' });
  await vote({ session: 'session-bbbb', level: 'four', choice: 'pull' });
  let r = await (await vote({ session: 'session-bbbb', level: 'four', choice: 'pull' })).json();
  assert.deepEqual([r.pull, r.stay], [1, 0]);
  r = await (await vote({ session: 'session-bbbb', level: 'four', choice: 'stay' })).json();
  assert.deepEqual([r.pull, r.stay], [0, 1]);
  r = await (await vote({ session: 'session-cccc', level: 'four', choice: 'stay' })).json();
  assert.deepEqual([r.pull, r.stay], [0, 2]);
});

test('آمار کلی شامل تعداد بازیکن‌هاست', async () => {
  const stats = await (await fetch(`${base}/api/stats`)).json();
  assert.equal(stats.players, 3);
  assert.deepEqual(stats.levels.four, { pull: 0, stay: 2 });
});

test('ورودی نامعتبر رد می‌شود', async () => {
  assert.equal((await vote({ session: 'session-dddd', level: 'nope', choice: 'pull' })).status, 400);
  assert.equal((await vote({ session: 'session-dddd', level: 'original', choice: 'maybe' })).status, 400);
  assert.equal((await vote({ session: 'x', level: 'original', choice: 'pull' })).status, 400);
  const bad = await fetch(`${base}/api/vote`, { method: 'POST', body: '{not json' });
  assert.equal(bad.status, 400);
  assert.equal((await fetch(`${base}/api/vote`)).status, 405);
});

test('فایل‌های ایستا سرو می‌شوند و مسیرهای خارج از public بسته‌اند', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /دردسرهای سوزن‌بان/);
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  const js = await fetch(`${base}/js/levels.js`);
  assert.match(js.headers.get('content-type'), /javascript/);
  const evil = await fetch(`${base}/..%2fserver%2fdb.js`);
  assert.notEqual(evil.status, 200);
});

test('مرحله‌ی «بازیکن قبلی» رأی نمی‌گیرد', async () => {
  assert.equal((await vote({ session: 'session-eeee', level: 'previous-player', choice: 'pull' })).status, 400);
});

test('سرآیند کش: کد و صفحه هر بار بررسی می‌شوند، فونت و تصویر و صدا یک هفته می‌مانند', async () => {
  const expect = {
    '/': 'no-cache',
    '/index.html': 'no-cache',
    '/l/original': 'no-cache',
    '/js/app.js': 'no-cache',
    '/css/style.css': 'no-cache',
    '/site.webmanifest': 'no-cache',
    '/fonts/estedad-arabic.woff2': 'public, max-age=604800',
    '/og.png': 'public, max-age=604800',
    '/favicon.svg': 'public, max-age=604800',
    '/audio/silence.wav': 'public, max-age=604800',
  };
  for (const [path, cc] of Object.entries(expect)) {
    const res = await fetch(base + path);
    await res.arrayBuffer();
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('cache-control'), cc, path);
    const etag = res.headers.get('etag');
    assert.ok(etag, `ETag برای ${path}`);
    // بررسی دوباره با ETag یک 304 سریع می‌دهد
    const again = await fetch(base + path, { headers: { 'If-None-Match': etag } });
    assert.equal(again.status, 304, path);
    assert.equal(again.headers.get('cache-control'), cc, path);
  }
});
