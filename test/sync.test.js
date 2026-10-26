import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/index.js';
import { createSyncWorker } from '../server/sync.js';
import { openStore } from '../server/db.js';

const SECRET = 'test-secret-0123456789-abcdefgh';
const quiet = { info() {}, warn() {} };

async function listen(server, port = 0) {
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return `http://127.0.0.1:${server.address().port}`;
}
const close = (server) => new Promise((r) => server.close(r));

async function vote(base, session, level, choice, headers = {}) {
  const res = await fetch(`${base}/api/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ session, level, choice }),
  });
  assert.equal(res.status, 200);
  return res.json();
}
const stats = async (base) => (await fetch(`${base}/api/stats`)).json();

test('همگام‌سازی دوطرفه، حل تداخل و خودتوانی', async (t) => {
  const intl = createApp({ region: 'intl', syncSecret: SECRET });
  const intlUrl = await listen(intl);
  const ir = createApp({ region: 'ir', syncSecret: SECRET, syncPeer: intlUrl, startSync: false });
  const irUrl = await listen(ir);
  t.after(() => Promise.all([ir.listening && close(ir), intl.listening && close(intl)]));

  await vote(intlUrl, 'abroad-user-1', 'original', 'pull');
  await vote(intlUrl, 'abroad-user-2', 'original', 'stay');
  await vote(irUrl, 'iran-user-1', 'original', 'pull');
  await vote(irUrl, 'iran-user-2', 'tea', 'stay');
  // یک کاربر روی هر دو سرور به یک مرحله رأی داده؛ رأی بعدی (روی ایران) باید برنده شود
  await vote(intlUrl, 'traveler-001', 'four', 'stay');
  await new Promise((r) => setTimeout(r, 5));
  await vote(irUrl, 'traveler-001', 'four', 'pull');

  const r1 = await ir.sync.run();
  assert.equal(r1.ok, true);
  // رأی قدیمی‌ترِ «مسافر» از خارج در ایران اعمال نمی‌شود (رأی جدیدتر ایران برنده است)
  assert.equal(r1.pulled, 2);
  assert.equal(r1.pushed, 3);

  const [a, b] = await Promise.all([stats(intlUrl), stats(irUrl)]);
  assert.deepEqual(a.levels, b.levels);
  assert.deepEqual(a.levels.original, { pull: 2, stay: 1 });
  assert.deepEqual(a.levels.four, { pull: 1, stay: 0 });
  assert.deepEqual(a.levels.tea, { pull: 0, stay: 1 });
  assert.equal(a.players, 5);
  assert.equal(b.players, 5);

  // اجرای دوباره چیزی را تکراری نمی‌کند
  const r2 = await ir.sync.run();
  assert.deepEqual([r2.pulled, r2.pushed], [0, 0]);
  assert.deepEqual((await stats(irUrl)).levels, a.levels);

  // تغییر نظر بعد از همگام‌سازی هم منتقل می‌شود
  await vote(intlUrl, 'iran-user-1', 'original', 'stay');
  await ir.sync.run();
  assert.deepEqual((await stats(irUrl)).levels.original, { pull: 1, stay: 2 });
});

test('قطعی طولانی: رأی‌ها جمع می‌شوند و بعد از وصل شدن از همان‌جا ادامه می‌یابد', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sozanban-'));
  try {
    let intl = createApp({ region: 'intl', syncSecret: SECRET, dbPath: join(dir, 'intl.db') });
    const intlUrl = await listen(intl);
    const port = intl.address().port;
    const ir = createApp({ region: 'ir', dbPath: join(dir, 'ir.db') });
    const irUrl = await listen(ir);
    const worker = createSyncWorker({ store: ir.store, peer: intlUrl, secret: SECRET, batch: 3, timeoutMs: 2000, log: quiet });

    await vote(intlUrl, 'before-cut-1', 'derby', 'pull');
    assert.equal((await worker.run()).ok, true);

    // «قطع اینترنت»: سرور خارج در دسترس نیست
    await close(intl);
    for (let i = 0; i < 7; i++) await vote(irUrl, `iran-offline-${i}`, 'derby', i % 2 ? 'pull' : 'stay');
    const failed = await worker.run();
    assert.equal(failed.ok, false);
    assert.ok(ir.store.status().peers[0].last_error);

    // «وصل شدن»: همان سرور با همان دیتابیس برمی‌گردد و در این مدت رأی تازه هم گرفته
    intl = createApp({ region: 'intl', syncSecret: SECRET, dbPath: join(dir, 'intl.db') });
    await listen(intl, port);
    for (let i = 0; i < 4; i++) await vote(intlUrl, `abroad-during-cut-${i}`, 'derby', 'pull');
    const ok = await worker.run();
    assert.equal(ok.ok, true);
    assert.equal(ok.pushed, 7);
    assert.equal(ok.pulled, 4);

    const [a, b] = await Promise.all([stats(intlUrl), stats(irUrl)]);
    assert.deepEqual(a.levels.derby, { pull: 8, stay: 4 });
    assert.deepEqual(a.levels, b.levels);
    assert.equal(ir.store.status().peers[0].last_error, null);

    await close(ir);
    await close(intl);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('دیتابیس نسخه‌ی قبلی (بدون ستون‌های همگام‌سازی) مهاجرت می‌کند', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sozanban-'));
  try {
    const path = join(dir, 'old.db');
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE votes (session TEXT NOT NULL, level TEXT NOT NULL, choice TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (session, level));
      CREATE TABLE tallies (level TEXT NOT NULL, choice TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (level, choice));
      CREATE TABLE sessions (session TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
      INSERT INTO votes VALUES ('old-session-1', 'original', 'pull', 1, 1), ('old-session-2', 'original', 'stay', 2, 2);
      INSERT INTO tallies VALUES ('original', 'pull', 1), ('original', 'stay', 1);
      INSERT INTO sessions VALUES ('old-session-1', 1), ('old-session-2', 2);
    `);
    old.close();

    const store = openStore(path, { region: 'intl' });
    const ch = store.changesSince(0);
    assert.equal(ch.rows.length, 2);
    assert.ok(ch.rows.every((r) => r.origin === 'intl'));
    assert.equal(ch.last, 2);
    store.castVote('new-session-1', 'original', 'pull');
    assert.equal(store.changesSince(2).rows[0].session, 'new-session-1');
    assert.deepEqual(store.levelStats('original'), { pull: 2, stay: 1 });
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('endpointهای همگام‌سازی بدون کلید درست بسته‌اند', async () => {
  const open = createApp({ region: 'intl' });
  const openUrl = await listen(open);
  assert.equal((await fetch(`${openUrl}/api/sync/status`)).status, 404);
  await close(open);

  const app = createApp({ region: 'intl', syncSecret: SECRET });
  const url = await listen(app);
  assert.equal((await fetch(`${url}/api/sync/status`)).status, 401);
  assert.equal((await fetch(`${url}/api/sync/status`, { headers: { Authorization: 'Bearer wrong-secret-wrong-secret' } })).status, 401);
  const ok = await fetch(`${url}/api/sync/status`, { headers: { Authorization: `Bearer ${SECRET}` } });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).region, 'intl');
  // ردیف‌های نامعتبر نادیده گرفته می‌شوند
  const res = await fetch(`${url}/api/sync/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: [{ session: 'x', level: 'nope' }, { session: 'valid-session-1', level: 'tea', choice: 'pull', created_at: 1, updated_at: 1, origin: 'ir' }] }),
  });
  assert.deepEqual(await res.json(), { region: 'intl', applied: 1, skipped: 0, invalid: 1 });
  await close(app);
});

test('پیشنهاد نسخه‌ی مناسب بر اساس کشور', async () => {
  const intl = createApp({ region: 'intl', trustProxy: true, geoRedirect: true, altUrl: 'https://souzanbaan.ir' });
  const ir = createApp({ region: 'ir', trustProxy: true, geoRedirect: true, altUrl: 'https://soozanban.com' });
  const [intlUrl, irUrl] = await Promise.all([listen(intl), listen(ir)]);
  const where = async (base, ip) => (await fetch(`${base}/api/whereami`, { headers: { 'X-Forwarded-For': ip } })).json();

  assert.equal((await where(intlUrl, '62.60.211.199')).suggest, 'https://souzanbaan.ir');
  assert.equal((await where(intlUrl, '8.8.8.8')).suggest, null);
  assert.equal((await where(irUrl, '8.8.8.8')).suggest, 'https://soozanban.com');
  assert.equal((await where(irUrl, '2.144.0.10')).suggest, null);
  const local = await where(irUrl, '127.0.0.1');
  assert.deepEqual([local.country, local.suggest, local.alt], ['unknown', null, 'https://soozanban.com']);
  // مقدار جعلی که کاربر اول X-Forwarded-For می‌گذارد نادیده گرفته می‌شود؛ آخرین مقدار (اضافه‌شده توسط پراکسی) ملاک است
  assert.equal((await where(intlUrl, '2.144.0.10, 8.8.8.8')).country, 'other');
  const cf = createApp({ region: 'intl', trustProxy: 'cloudflare', geoRedirect: true, altUrl: 'https://souzanbaan.ir' });
  const cfUrl = await listen(cf);
  const viaCf = await (await fetch(`${cfUrl}/api/whereami`, { headers: { 'CF-Connecting-IP': '62.60.211.199', 'X-Forwarded-For': '62.60.211.199, 172.70.1.1' } })).json();
  assert.equal(viaCf.suggest, 'https://souzanbaan.ir');
  await close(cf);
  await Promise.all([close(intl), close(ir)]);
});
