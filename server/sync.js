// همگام‌ساز رأی‌ها با سرور دیگر.
// فقط یک طرف (سرور ایران) آن را اجرا می‌کند: هم تغییرات طرف مقابل را می‌گیرد (pull) و هم تغییرات خودش را می‌فرستد (push).
// اگر ارتباط قطع باشد خطا ثبت می‌شود و دور بعد دوباره تلاش می‌کند؛ نشانگرها در دیتابیس ذخیره‌اند،
// پس بعد از وصل شدن دوباره (حتی بعد از ماه‌ها) دقیقاً از جایی که مانده ادامه می‌دهد.
import { fileURLToPath } from 'node:url';
import { normalize } from 'node:path';

export function createSyncWorker({ store, peer, secret, intervalMs = 300_000, batch = 1000, timeoutMs = 20_000, onApplied = () => {}, log = console }) {
  const base = peer.replace(/\/+$/, '');
  let running = null;
  let timer = null;

  async function call(path, init = {}) {
    const res = await fetch(base + path, {
      ...init,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    return res.json();
  }

  async function syncOnce() {
    const state = store.getSyncState(base);
    store.setSyncState(base, { last_attempt: Date.now() });
    let pulled = 0;
    let pushed = 0;
    let peerRegion = null;
    try {
      // ۱) گرفتن تغییرات طرف مقابل
      let after = state.pulled;
      for (;;) {
        const r = await call(`/api/sync/changes?after=${after}&limit=${batch}&exclude=${encodeURIComponent(store.region)}`);
        peerRegion = r.region;
        if (r.rows.length) {
          pulled += store.applyRemote(r.rows).applied;
          onApplied();
        }
        after = r.last;
        store.setSyncState(base, { pulled: after });
        if (!r.more) break;
      }
      // ۲) فرستادن تغییرات خودمان (به‌جز آن‌هایی که از خود طرف مقابل آمده‌اند)
      let pAfter = state.pushed;
      for (;;) {
        const ch = store.changesSince(pAfter, { limit: batch, excludeOrigin: peerRegion });
        if (ch.rows.length) {
          const r = await call('/api/sync/apply', { method: 'POST', body: JSON.stringify({ from: store.region, rows: ch.rows }) });
          pushed += r.applied;
        }
        pAfter = ch.last;
        store.setSyncState(base, { pushed: pAfter });
        if (!ch.more) break;
      }
      store.setSyncState(base, { last_ok: Date.now(), last_error: null });
      if (pulled || pushed) log.info?.(`🔄 sync با ${base}: ${pulled} رأی دریافت، ${pushed} رأی ارسال شد`);
      return { ok: true, pulled, pushed };
    } catch (err) {
      store.setSyncState(base, { last_error: String(err.message || err).slice(0, 300) });
      log.warn?.(`⚠️ sync با ${base} ناموفق: ${err.message || err}`);
      return { ok: false, pulled, pushed, error: String(err.message || err) };
    }
  }

  // جلوگیری از اجرای هم‌زمان دو دور
  function run() {
    running ??= syncOnce().finally(() => { running = null; });
    return running;
  }

  return {
    run,
    start() {
      setTimeout(run, 3000).unref();
      timer = setInterval(run, intervalMs);
      timer.unref();
    },
    stop() {
      clearInterval(timer);
    },
  };
}

// اجرای دستی یک دور: npm run sync
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1]);
if (isMain) {
  const { openStore } = await import('./db.js');
  const { loadConfig } = await import('./config.js');
  const cfg = loadConfig();
  if (!cfg.syncPeer || !cfg.syncSecret) {
    console.error('SYNC_PEER و SYNC_SECRET باید تنظیم شده باشند.');
    process.exit(1);
  }
  const store = openStore(cfg.dbPath, { region: cfg.region });
  const result = await createSyncWorker({ store, peer: cfg.syncPeer, secret: cfg.syncSecret }).run();
  console.log(JSON.stringify({ ...result, status: store.status() }, null, 2));
  store.close();
  process.exit(result.ok ? 0 : 1);
}
