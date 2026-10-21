// سرور «دردسرهای سوزن‌بان»: فایل‌های ایستا + API رأی‌گیری
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { openStore, CHOICES } from './db.js';
import { LEVELS } from '../public/js/levels.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest', '.txt']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

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

export function createApp({ dbPath = ':memory:', trustProxy = false, voteLimit = 120 } = {}) {
  const store = openStore(dbPath);
  const allowVote = rateLimiter({ windowMs: 60_000, max: voteLimit });
  const fileCache = new Map();
  let statsCache = null;

  const clientIp = (req) =>
    (trustProxy && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || '?';

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
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
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

  const server = createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname === '/api/vote') {
        if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
        return await handleVote(req, res);
      }
      if (pathname === '/api/stats') return handleStats(res);
      if (pathname === '/healthz') return json(res, 200, { ok: true });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
      return await serveStatic(req, res, pathname);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) json(res, 500, { error: 'خطای سرور' });
      else res.end();
    }
  });

  server.on('close', () => store.close());
  return server;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1]);
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const server = createApp({
    dbPath: process.env.DB_PATH || join(ROOT, 'data', 'votes.db'),
    trustProxy: process.env.TRUST_PROXY === '1',
    voteLimit: Number(process.env.VOTE_LIMIT) || 120,
  });
  server.listen(port, host, () => console.log(`🚋 دردسرهای سوزن‌بان روی http://localhost:${port} آماده است`));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
}
