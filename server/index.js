// سرور «دردسرهای سوزن‌بان»: فایل‌های ایستا + API رأی‌گیری
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash, timingSafeEqual } from 'node:crypto';
import { openStore, CHOICES } from './db.js';
import { createSyncWorker } from './sync.js';
import { countryOf } from './geo.js';
import { loadConfig, ROOT } from './config.js';
import { LEVELS } from '../public/js/levels.js';

const PUBLIC = join(ROOT, 'public');
const LEVEL_IDS = new Set(LEVELS.map((l) => l.id));
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest', '.txt']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

const csp = (altUrl) => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  `connect-src 'self'${altUrl ? ` ${altUrl}` : ''}`,
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// محدودیت ساده‌ی نرخ درخواست برای هر IP
function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (now - h.start > windowMs) hits.delete(ip);
  }, windowMs).unref();
  return (ip) => {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.start > windowMs) {
      hits.set(ip, { start: now, n: 1 });
      return true;
    }
    h.n += 1;
    return h.n <= max;
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), {
    'Content-Type': MIME['.json'],
    'Cache-Control': 'no-store',
  });
}

function readBody(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const ORIGIN_RE = /^[a-z0-9_-]{1,16}$/i;
const MAX_SYNC_ROWS = 2000;

function validRemoteRow(r) {
  return (
    r && typeof r === 'object' &&
    typeof r.session === 'string' && SESSION_RE.test(r.session) &&
    LEVEL_IDS.has(r.level) &&
    CHOICES.includes(r.choice) &&
    Number.isSafeInteger(r.created_at) && Number.isSafeInteger(r.updated_at) &&
    typeof r.origin === 'string' && ORIGIN_RE.test(r.origin)
  );
}

export function createApp({
  dbPath = ':memory:',
  trustProxy = false,
  voteLimit = 120,
  region = 'main',
  altUrl = '',
  geoRedirect = false,
  syncSecret = '',
  syncPeer = '',
  syncInterval = 300_000,
  startSync = true,
} = {}) {
  const store = openStore(dbPath, { region });
  const allowVote = rateLimiter({ windowMs: 60_000, max: voteLimit });
  const fileCache = new Map();
  let statsCache = null;
  const secretHash = syncSecret ? createHash('sha256').update(syncSecret).digest() : null;

  // پشت پراکسی: آخرین مقدار X-Forwarded-For را خود پراکسی ما (Apache/LiteSpeed) اضافه کرده و قابل جعل نیست؛
  // مقدارهای قبلی را کاربر می‌تواند بفرستد. پشت Cloudflare از CF-Connecting-IP استفاده می‌شود.
  const clientIp = (req) => {
    if (trustProxy === 'cloudflare' && req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].trim();
    if (trustProxy && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',').at(-1).trim();
    return req.socket.remoteAddress || '?';
  };

  const sync = syncPeer && syncSecret
    ? createSyncWorker({ store, peer: syncPeer, secret: syncSecret, intervalMs: syncInterval, onApplied: () => { statsCache = null; } })
    : null;

  async function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = normalize(join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');

    let info;
    try {
      info = await stat(file);
      if (!info.isFile()) throw new Error('not file');
    } catch {
      return send(res, 404, 'پیدا نشد', { 'Content-Type': MIME['.txt'] });
    }

    const ext = extname(file);
    const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      ETag: etag,
      Vary: 'Accept-Encoding',
    };
    if (req.headers['if-none-match'] === etag) return send(res, 304, null, headers);

    let cached = fileCache.get(file);
    if (!cached || cached.etag !== etag) {
      const raw = await readFile(file);
      cached = { etag, raw, gz: COMPRESSIBLE.has(ext) ? gzipSync(raw) : null };
      fileCache.set(file, cached);
    }
    const useGzip = cached.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (useGzip) headers['Content-Encoding'] = 'gzip';
    send(res, 200, req.method === 'HEAD' ? null : useGzip ? cached.gz : cached.raw, headers);
  }

  async function handleVote(req, res) {
    if (!allowVote(clientIp(req))) return json(res, 429, { error: 'درخواست‌ها زیاد است؛ کمی صبر کنید.' });
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch (err) {
      return json(res, err.status || 400, { error: 'بدنه‌ی درخواست نامعتبر است.' });
    }
    const { session, level, choice } = data || {};
    if (typeof session !== 'string' || !SESSION_RE.test(session)) return json(res, 400, { error: 'شناسه‌ی نشست نامعتبر است.' });
    if (!LEVEL_IDS.has(level)) return json(res, 400, { error: 'مرحله پیدا نشد.' });
    if (!CHOICES.includes(choice)) return json(res, 400, { error: 'انتخاب نامعتبر است.' });
    const stats = store.castVote(session, level, choice);
    statsCache = null;
    json(res, 200, { level, ...stats });
  }

  function handleStats(res) {
    if (!statsCache || Date.now() - statsCache.at > 2000) statsCache = { at: Date.now(), data: store.allStats() };
    json(res, 200, statsCache.data);
  }

  // کدام نسخه برای این کاربر مناسب‌تر است؟ (هدایت در خود مرورگر انجام می‌شود تا پیشرفت بازی منتقل شود)
  function handleWhereami(req, res) {
    const country = countryOf(clientIp(req));
    let suggest = null;
    if (geoRedirect && altUrl) {
      if (region === 'intl' && country === 'IR') suggest = altUrl;
      if (region === 'ir' && country === 'other') suggest = altUrl;
    }
    json(res, 200, { region, country, alt: altUrl || null, suggest });
  }

  function syncAuthorized(req) {
    if (!secretHash) return false;
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return false;
    return timingSafeEqual(createHash('sha256').update(m[1]).digest(), secretHash);
  }

  async function handleSync(req, res, url) {
    if (!syncAuthorized(req)) return json(res, secretHash ? 401 : 404, { error: secretHash ? 'unauthorized' : 'not found' });
    const route = url.pathname.slice('/api/sync/'.length);
    if (route === 'changes' && req.method === 'GET') {
      const after = Math.max(0, Number(url.searchParams.get('after')) || 0);
      const limit = Math.min(MAX_SYNC_ROWS, Math.max(1, Number(url.searchParams.get('limit')) || 1000));
      const exclude = url.searchParams.get('exclude') || null;
      return json(res, 200, { region, ...store.changesSince(after, { limit, excludeOrigin: exclude }) });
    }
    if (route === 'apply' && req.method === 'POST') {
      let data;
      try {
        data = JSON.parse(await readBody(req, 8 * 1024 * 1024));
      } catch (err) {
        return json(res, err.status || 400, { error: 'invalid body' });
      }
      if (!Array.isArray(data?.rows) || data.rows.length > MAX_SYNC_ROWS) return json(res, 400, { error: 'rows' });
      const rows = data.rows.filter(validRemoteRow);
      const result = store.applyRemote(rows);
      statsCache = null;
      return json(res, 200, { region, ...result, invalid: data.rows.length - rows.length });
    }
    if (route === 'status' && req.method === 'GET') return json(res, 200, store.status());
    if (route === 'run' && req.method === 'POST') {
      if (!sync) return json(res, 400, { error: 'این سرور همگام‌سازی را شروع نمی‌کند (SYNC_PEER تنظیم نشده)' });
      return json(res, 200, await sync.run());
    }
    return json(res, 404, { error: 'not found' });
  }

  const cspHeader = csp(altUrl);

  const server = createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', cspHeader);
    try {
      const url = new URL(req.url, 'http://localhost');
      const { pathname } = url;
      if (pathname === '/api/vote') {
        if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
        return await handleVote(req, res);
      }
      if (pathname === '/api/stats') return handleStats(res);
      if (pathname === '/api/whereami') return handleWhereami(req, res);
      if (pathname.startsWith('/api/sync/')) return await handleSync(req, res, url);
      if (pathname === '/healthz') return json(res, 200, { ok: true, region });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
      return await serveStatic(req, res, pathname);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) json(res, 500, { error: 'خطای سرور' });
      else res.end();
    }
  });

  if (sync && startSync) server.on('listening', () => sync.start());
  server.on('close', () => {
    sync?.stop();
    store.close();
  });
  server.sync = sync;
  server.store = store;
  return server;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1]);
if (isMain) {
  const cfg = loadConfig();
  const server = createApp(cfg);
  server.listen(cfg.port, cfg.host, () => {
    console.log(`🚋 دردسرهای سوزن‌بان (${cfg.region}) روی http://localhost:${cfg.port} آماده است`);
    if (cfg.syncPeer) console.log(`🔄 همگام‌سازی با ${cfg.syncPeer} هر ${cfg.syncInterval / 1000} ثانیه`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
}
