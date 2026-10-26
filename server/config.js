// تنظیمات از متغیرهای محیطی (و فایل اختیاری .env در ریشه‌ی پروژه)
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(env = process.env) {
  const envFile = join(ROOT, '.env');
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);
  const cfg = {
    port: Number(env.PORT) || 3000,
    host: env.HOST || '0.0.0.0',
    dbPath: env.DB_PATH || join(ROOT, 'data', 'votes.db'),
    // 1: پشت Apache/LiteSpeed/nginx — cloudflare: پشت Cloudflare (پراکسی نارنجی)
    trustProxy: env.TRUST_PROXY === 'cloudflare' ? 'cloudflare' : env.TRUST_PROXY === '1',
    voteLimit: Number(env.VOTE_LIMIT) || 120,
    // ir یا intl — روی رأی‌ها برچسب مبدأ می‌زند و رفتار هدایت را تعیین می‌کند
    region: (env.REGION || 'main').trim(),
    // آدرس عمومی نسخه‌ی دیگر (برای هدایت کاربر و لینک «نسخه‌ی دیگر»)
    altUrl: (env.ALT_URL || '').replace(/\/+$/, ''),
    geoRedirect: env.GEO_REDIRECT === '1',
    // کلید مشترک بین دو سرور برای endpointهای همگام‌سازی
    syncSecret: env.SYNC_SECRET || '',
    // فقط روی سروری که همگام‌سازی را شروع می‌کند (سرور ایران): آدرس سرور دیگر
    syncPeer: (env.SYNC_PEER || '').replace(/\/+$/, ''),
    syncInterval: (Number(env.SYNC_INTERVAL) || 300) * 1000,
  };
  if (cfg.syncSecret && cfg.syncSecret.length < 24) throw new Error('SYNC_SECRET باید دست‌کم ۲۴ کاراکتر باشد.');
  if (!/^[a-z0-9_-]{1,16}$/i.test(cfg.region)) throw new Error('REGION نامعتبر است (مثلاً ir یا intl).');
  return cfg;
}
