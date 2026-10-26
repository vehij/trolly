import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { LEVELS } from '../public/js/levels.js';
import { ITEMS } from '../public/js/art.js';

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

test('داده‌ی مرحله‌ها سالم است', () => {
  const ids = new Set();
  for (const l of LEVELS) {
    assert.ok(!ids.has(l.id), `شناسه‌ی تکراری: ${l.id}`);
    ids.add(l.id);
    assert.ok(l.title && l.text, l.id);
    for (const track of [l.top, l.bottom]) {
      for (const item of track.items) assert.ok(ITEMS[item.k], `آیتم ناشناخته ${item.k} در ${l.id}`);
    }
  }
  assert.ok(LEVELS.length >= 10);
});
