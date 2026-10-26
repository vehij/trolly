// تگ‌های پیش‌نمایش لینک (Open Graph و توییتر) با آدرس کامل، بر اساس دامنه‌ای که درخواست به آن آمده
import { LEVELS } from '../public/js/levels.js';

const SITE = 'دردسرهای سوزن‌بان';
const DESC = 'دوراهی‌های اخلاقی عجیب و خنده‌دار: اهرم را می‌کشید یا نه؟ تصمیم بگیرید و ببینید بقیه‌ی مردم چه کردند.';
const OG_DESC = 'اهرم دست شماست. می‌کشید یا کاری نمی‌کنید؟ ببینید بقیه چه تصمیمی گرفتند.';

const HOSTS = new Set(['soozanban.com', 'www.soozanban.com', 'souzanbaan.ir', 'www.souzanbaan.ir']);
const LOCAL_RE = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
const FALLBACK = { intl: 'https://soozanban.com', ir: 'https://souzanbaan.ir' };

// فقط دامنه‌های خودمان پذیرفته می‌شوند؛ هدر Host دلخواه نمی‌تواند آدرس دیگری در صفحه بنشاند
export function originFor(host, region) {
  const h = String(host || '').trim().toLowerCase();
  if (HOSTS.has(h)) return `https://${h}`;
  if (LOCAL_RE.test(h)) return `http://${h}`;
  return FALLBACK[region] || FALLBACK.intl;
}

export const levelById = (id) => LEVELS.find((l) => l.id === id) || null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function clip(text, max = 150) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : max)}…`;
}

// level: شیء مرحله یا null برای صفحه‌ی اول — hasLevelImage: آیا public/og/<id>.png وجود دارد
export function metaTags({ origin, level = null, hasLevelImage = false }) {
  const path = level ? `/l/${encodeURIComponent(level.id)}` : '/';
  const url = origin + path;
  const title = level ? `${level.title} | ${SITE}` : SITE;
  const desc = level ? `${clip(level.text)} تو چه می‌کنی؟` : DESC;
  const ogDesc = level ? desc : OG_DESC;
  const image = `${origin}${level && hasLevelImage ? `/og/${encodeURIComponent(level.id)}.png` : '/og.png'}`;
  const alt = level ? `${SITE}: ${level.title}` : `${SITE}: یک قطار، یک اهرم و یک دوراهی`;
  const m = (attr, key, val) => `<meta ${attr}="${key}" content="${esc(val)}">`;
  return [
    `<title>${esc(title)}</title>`,
    m('name', 'description', desc),
    `<link rel="canonical" href="${esc(url)}">`,
    m('property', 'og:type', 'website'),
    m('property', 'og:site_name', SITE),
    m('property', 'og:locale', 'fa_IR'),
    m('property', 'og:url', url),
    m('property', 'og:title', title),
    m('property', 'og:description', ogDesc),
    m('property', 'og:image', image),
    m('property', 'og:image:type', 'image/png'),
    m('property', 'og:image:width', '1200'),
    m('property', 'og:image:height', '630'),
    m('property', 'og:image:alt', alt),
    m('name', 'twitter:card', 'summary_large_image'),
    m('name', 'twitter:title', title),
    m('name', 'twitter:description', ogDesc),
    m('name', 'twitter:image', image),
    m('name', 'twitter:image:alt', alt),
  ].join('\n  ');
}

const BLOCK_RE = /<!--meta-->[\s\S]*?<!--\/meta-->/;

export function injectMeta(html, opts) {
  return html.replace(BLOCK_RE, `<!--meta-->\n  ${metaTags(opts)}\n  <!--/meta-->`);
}
