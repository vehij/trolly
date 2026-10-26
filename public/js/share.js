// اشتراک‌گذاری: ساخت تصویر نتیجه و مرحله با canvas، اشتراک‌گذاری بومی گوشی و پنجره‌ی اشتراک برای بقیه
import * as A from './art.js';
import { DEFAULT_LABELS, MIN_VOTES, hasChoice } from './levels.js';
import { createScene, W as SCENE_W, H as SCENE_H } from './scene.js';

const fa = A.fa;
const SITE = 'دردسرهای سوزن‌بان';
const C = {
  paper: '#f5eedf',
  paper2: '#e9dec8',
  ink: '#1e1b2b',
  soft: '#6f6879',
  accent: '#e8553a',
  onAccent: '#fffaf0',
  teal: '#2f9c8f',
  mustard: '#edb33c',
};
const FONT = "Estedad, Tahoma, 'Segoe UI', sans-serif";
const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
export const FORMATS = { story: [1080, 1920], post: [1080, 1350], og: [1200, 630] };

// ───────── آماده‌سازی: فونت و استایل SVG ─────────
let fontsPromise = null;
export function fontsReady() {
  if (!fontsPromise) {
    const sample = 'سوزن‌بان ۱۲۳ abc';
    fontsPromise = Promise.all(['400', '600', '800', '900'].map((w) => document.fonts?.load(`${w} 40px Estedad`, sample)))
      .catch(() => {});
  }
  return fontsPromise;
}

// تصویرهای SVG خطی بازی با کلاس‌های CSS رنگ می‌گیرند؛ برای کشیدن روی canvas همان CSS (در حالت روشن و بی‌انیمیشن) داخل SVG گذاشته می‌شود
let cssPromise = null;
function svgCss() {
  if (!cssPromise) {
    cssPromise = fetch('/css/style.css')
      .then((r) => r.text())
      .then((css) => css
        .replace(/@font-face\s*\{[^}]*\}/g, '')
        .replace(/@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\n\}\n/, '')
        .concat('\n*{animation:none!important;transition:none!important}'))
      .catch(() => '');
  }
  return cssPromise;
}

async function svgImage(inner, viewBox, w, h, cls = '') {
  const css = await svgCss();
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" class="${cls}"><style>${css}</style>${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function heroMarkup() {
  return A.heroScene(`<g transform="translate(${A.HERO_TROLLEY_PARK} ${A.HERO_RAIL_Y})">${A.trolley({ passengers: 2 })}</g>`);
}

// عکس ثابت از صحنه‌ی یک مرحله: صحنه بیرون از دید ساخته می‌شود، قطار سر جایش قرار می‌گیرد و برچسب‌ها جدا خوانده می‌شوند
function sceneSnapshot(level) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${SCENE_W}px;pointer-events:none;`;
  document.body.append(host);
  const scene = createScene(host, level, {});
  const svg = host.querySelector('svg').cloneNode(true);
  const labels = [...host.querySelectorAll('.overlay > *')].map((n) => ({
    text: n.textContent,
    x: (parseFloat(n.style.left) / 100) * SCENE_W,
    y: (parseFloat(n.style.top) / 100) * SCENE_H,
    tag: n.classList.contains('item-tag'),
  }));
  scene.destroy();
  host.remove();
  const trolleyG = svg.querySelector('.trolley-g');
  trolleyG?.setAttribute('transform', `translate(${trolleyG.getAttribute('data-rest') || '830 160'})`);
  for (const n of svg.querySelectorAll('.measure, .preview-line, .fx')) n.remove();
  for (const n of svg.querySelectorAll('[pathLength]')) n.removeAttribute('pathLength');
  return { inner: svg.innerHTML, labels };
}

// ───────── ابزارهای کشیدن ─────────
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { c, ctx };
}

const font = (ctx, size, weight = 800) => { ctx.font = `${weight} ${size}px ${FONT}`; };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// کارت با سایه‌ی تخت مثل دکمه‌های بازی
function card(ctx, x, y, w, h, { r = 28, fill = C.paper, line = 5, shadow = 10 } = {}) {
  if (shadow) {
    roundRect(ctx, x - shadow, y + shadow, w, h, r);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// متن چندخطی وسط‌چین؛ اگر جا نشد کوچک می‌شود. ارتفاع مصرف‌شده را برمی‌گرداند
function textBlock(ctx, text, { x, y, maxW, size, weight = 800, color = C.ink, lh = 1.55, maxLines = 4, align = 'center', min = 0.6 }) {
  let s = size;
  let lines;
  for (;;) {
    font(ctx, s, weight);
    lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines || s <= size * min) break;
    s = Math.round(s * 0.92);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s،,.؛:]+\S*$/, '')}…`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  lines.forEach((l, i) => ctx.fillText(l, x, y + s + i * s * lh));
  return s + (lines.length - 1) * s * lh + s * (lh - 1);
}

function emoji(ctx, ch, x, y, size) {
  ctx.font = `${size}px ${EMOJI}`;
  ctx.textAlign = 'center';
  ctx.fillText(ch, x, y);
}

function paper(ctx, w, h) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);
  // ریل پایین صفحه
  ctx.strokeStyle = C.soft;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 6;
  for (let x = -10; x < w + 40; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, h - 74);
    ctx.lineTo(x, h - 30);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.5;
  for (const yy of [h - 64, h - 40]) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }
}

// آرم کوچک اهرم + نام بازی
function brand(ctx, cx, y, size = 46) {
  font(ctx, size, 900);
  const tw = ctx.measureText(SITE).width;
  const icon = size * 1.3;
  const total = tw + icon + 18;
  const right = cx + total / 2;
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink;
  ctx.fillText(SITE, right - icon - 18, y + size * 0.36);
  const ix = right - icon / 2;
  const s = icon / 40;
  ctx.save();
  ctx.translate(ix - 20 * s, y - 20 * s);
  ctx.scale(s, s);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = C.ink;
  ctx.beginPath(); ctx.moveTo(8, 34); ctx.lineTo(32, 34); ctx.stroke();
  roundRect(ctx, 12, 29, 16, 6, 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(27, 9); ctx.stroke();
  ctx.beginPath(); ctx.arc(27.6, 7.6, 4.6, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
  ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();
}

// آدرس سایت، درشت و خوانا
function address(ctx, cx, y, host, path = '', size = 64) {
  ctx.save();
  ctx.direction = 'ltr';
  font(ctx, size, 900);
  const w = ctx.measureText(host).width + size * 1.4;
  const h = size * 1.7;
  card(ctx, cx - w / 2, y, w, h, { r: h / 2, fill: C.mustard, line: 5, shadow: 8 });
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText(host, cx, y + h / 2 + size * 0.36);
  if (path) {
    font(ctx, size * 0.42, 700);
    ctx.fillStyle = C.soft;
    ctx.fillText(host + path, cx, y + h + size * 0.75);
  }
  ctx.restore();
  return h + (path ? size * 0.9 : 0);
}

function pill(ctx, text, cx, y, size, { fill = C.paper, color = C.ink } = {}) {
  font(ctx, size, 800);
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  card(ctx, cx - w / 2, y - h / 2, w, h, { r: h / 2, fill, line: Math.max(2, size / 9), shadow: size / 6 });
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y + size * 0.38);
}

const firstSentence = (t) => {
  const m = /^[^.!؟?]+[.!؟?]/.exec(t);
  return (m ? m[0] : t).trim();
};

const toBlob = (c) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));

// ───────── تصویرها ─────────
// نتیجه‌ی نهایی: data = { deaths, arch: { name, icon, text, pulls, agreeCount, n }, host }
export async function renderResult(data, format = 'story') {
  await fontsReady();
  const [w, h] = FORMATS[format];
  const story = format === 'story';
  const { c, ctx } = canvas(w, h);
  paper(ctx, w, h);
  const cx = w / 2;
  let y = story ? 120 : 70;
  brand(ctx, cx, y, story ? 46 : 40);
  y += story ? 60 : 40;

  const heroH = story ? 300 : 160;
  const hero = await svgImage(heroMarkup(), '0 20 900 290', Math.round(heroH * (900 / 290)), heroH);
  ctx.drawImage(hero, cx - hero.width / 2, y);
  y += heroH + (story ? 30 : 10);

  font(ctx, story ? 44 : 36, 700);
  ctx.fillStyle = C.soft;
  ctx.textAlign = 'center';
  ctx.fillText('در این بازی', cx, y + 40);
  y += story ? 40 : 30;
  // عدد بزرگ تلفات با دورخط
  const numSize = story ? 260 : 170;
  font(ctx, numSize, 900);
  ctx.lineWidth = story ? 14 : 11;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(fa(data.deaths), cx, y + numSize * 0.95);
  ctx.fillStyle = C.accent;
  ctx.fillText(fa(data.deaths), cx, y + numSize * 0.95);
  y += numSize * 1.08;
  font(ctx, story ? 48 : 40, 800);
  ctx.fillStyle = C.ink;
  ctx.fillText('نفر را زیر قطار فرستادم', cx, y + 30);
  y += story ? 90 : 66;

  // کارت تیپ اخلاقی
  const cardW = w - 160;
  const cardH = story ? 380 : 290;
  card(ctx, cx - cardW / 2, y, cardW, cardH, { fill: C.paper2, r: 36, shadow: 12 });
  emoji(ctx, data.arch.icon, cx, y + (story ? 108 : 82), story ? 84 : 62);
  font(ctx, story ? 34 : 28, 700);
  ctx.fillStyle = C.soft;
  ctx.fillText('تیپ اخلاقی من', cx, y + (story ? 168 : 128));
  font(ctx, story ? 68 : 54, 900);
  ctx.fillStyle = C.accent;
  ctx.fillText(data.arch.name, cx, y + (story ? 262 : 204));
  textBlock(ctx, firstSentence(data.arch.text), { x: cx, y: y + (story ? 285 : 218), maxW: cardW - 80, size: story ? 32 : 27, weight: 600, color: C.ink, maxLines: 1, min: 0.7 });
  y += cardH + (story ? 50 : 34);

  // آمار کوچک
  const stats = [
    [data.arch.pulls, 'بار اهرم را کشیدم'],
    [data.arch.agreeCount, 'بار با اکثریت بودم'],
    [data.arch.n, 'مرحله را رد کردم'],
  ];
  const gap = 24;
  const bw = (cardW - gap * 2) / 3;
  const bh = story ? 170 : 124;
  stats.forEach(([n, label], i) => {
    const bx = cx + cardW / 2 - bw - i * (bw + gap);
    card(ctx, bx, y, bw, bh, { r: 26, line: 4, shadow: 7 });
    font(ctx, story ? 70 : 58, 900);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(fa(n), bx + bw / 2, y + bh * 0.52);
    font(ctx, story ? 28 : 24, 700);
    ctx.fillStyle = C.soft;
    ctx.fillText(label, bx + bw / 2, y + bh * 0.82);
  });
  y += bh + (story ? 90 : 46);

  font(ctx, story ? 76 : 56, 900);
  ctx.fillStyle = C.ink;
  ctx.fillText('تو چه می‌کنی؟', cx, y + 40);
  y += story ? 90 : 62;
  address(ctx, cx, y, data.host, '', story ? 64 : 52);
  return toBlob(c);
}

// یک مرحله: data = { level, stat: { pull, stay } | null, host, labels }
export async function renderLevel(data, format = 'story') {
  await fontsReady();
  const [w, h] = FORMATS[format];
  const story = format === 'story';
  const { c, ctx } = canvas(w, h);
  paper(ctx, w, h);
  const cx = w / 2;
  let y = story ? 120 : 70;
  brand(ctx, cx, y, story ? 46 : 40);
  y += story ? 80 : 56;

  y += textBlock(ctx, data.level.title, { x: cx, y, maxW: w - 160, size: story ? 84 : 66, weight: 900, color: C.accent, maxLines: 2, lh: 1.3 });
  y += story ? 40 : 20;

  const sw = w - 60;
  const sh = Math.round(sw * (SCENE_H / SCENE_W));
  await drawScene(ctx, data.level, 30, y, sw, sh);
  y += sh + (story ? 30 : 14);

  const maxQ = story ? 7 : 4;
  y += textBlock(ctx, data.level.text, { x: cx, y, maxW: w - 150, size: story ? 40 : 34, weight: 600, maxLines: maxQ, lh: 1.6 });
  y += story ? 50 : 24;

  const bottom = h - (story ? 380 : 290);
  const labels = { ...DEFAULT_LABELS, ...data.level.labels };
  const total = data.stat ? data.stat.pull + data.stat.stay : 0;
  const pct = hasChoice(data.level) && total >= MIN_VOTES ? Math.round((data.stat.pull / total) * 100) : null;
  const statH = story ? 170 : 140;
  const btnH = story ? 104 : 86;
  // دو دکمه‌ی انتخاب مثل خود بازی، و اگر رأی کافی هست، درصد کسانی که اهرم را کشیدند
  if (y + btnH + (pct !== null ? statH : 0) + 30 < bottom) {
    const gap = 30;
    const one = !hasChoice(data.level);
    const bw = one ? (w - 160) / 2 : (w - 160 - gap) / 2;
    const buttons = [[labels.pull, C.accent, C.onAccent], [labels.stay, C.paper, C.ink]].slice(0, one ? 1 : 2);
    buttons.forEach(([label, fill, color], i) => {
      const bx = one ? cx - bw / 2 : cx + gap / 2 + (i === 0 ? 0 : -bw - gap);
      card(ctx, bx, y, bw, btnH, { r: 30, fill, line: 5, shadow: 8 });
      textBlock(ctx, label, { x: bx + bw / 2, y: y + btnH / 2 - (story ? 26 : 22), maxW: bw - 40, size: story ? 40 : 34, weight: 800, color, maxLines: 1, min: 0.6 });
    });
    y += btnH + (story ? 56 : 36);
  }
  if (pct !== null && y + statH < bottom + 40) {
    const barW = w - 200;
    const barH = story ? 64 : 54;
    card(ctx, cx - barW / 2, y, barW, barH, { r: barH / 2, fill: C.teal, line: 5, shadow: 8 });
    ctx.save();
    roundRect(ctx, cx - barW / 2, y, barW, barH, barH / 2);
    ctx.clip();
    ctx.fillStyle = C.accent;
    ctx.fillRect(cx + barW / 2 - (barW * pct) / 100, y, (barW * pct) / 100, barH);
    ctx.restore();
    roundRect(ctx, cx - barW / 2, y, barW, barH, barH / 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    y += barH + (story ? 70 : 54);
    font(ctx, story ? 50 : 42, 800);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(`${fa(pct)}٪ اهرم را کشیدند`, cx, y);
    y += story ? 40 : 24;
  }

  y = Math.max(y, h - (story ? 410 : 300));
  font(ctx, story ? 76 : 58, 900);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('تو چه می‌کنی؟', cx, y + 70);
  y += story ? 120 : 96;
  address(ctx, cx, y, data.host, `/l/${data.level.id}`, story ? 60 : 48);
  return toBlob(c);
}

// معرفی بازی برای صفحه‌ی اول: data = { count, host }
export async function renderGame(data, format = 'story') {
  await fontsReady();
  const [w, h] = FORMATS[format];
  const story = format === 'story';
  const { c, ctx } = canvas(w, h);
  paper(ctx, w, h);
  const cx = w / 2;
  let y = story ? 380 : 120;
  const heroH = story ? 360 : 260;
  const hero = await svgImage(heroMarkup(), '0 20 900 290', Math.round(heroH * (900 / 290)), heroH);
  ctx.drawImage(hero, cx - hero.width / 2, y);
  y += heroH + 40;
  y += textBlock(ctx, SITE, { x: cx, y, maxW: w - 120, size: story ? 120 : 96, weight: 900, maxLines: 2, lh: 1.25 });
  y += 30;
  y += textBlock(ctx, `${fa(data.count)} دوراهی اخلاقی، یکی از یکی عجیب‌تر. اهرم دست توست؛ بعد از هر تصمیم می‌بینی بقیه چه کردند.`, { x: cx, y, maxW: w - 200, size: story ? 44 : 38, weight: 600, color: C.soft, maxLines: 4, lh: 1.6 });
  y = Math.max(y + 60, h - (story ? 460 : 330));
  pill(ctx, 'اهرم را می‌کشی یا نه؟', cx, y + 50, story ? 56 : 46, { fill: C.accent, color: C.onAccent });
  y += story ? 180 : 140;
  address(ctx, cx, y, data.host, '', story ? 64 : 52);
  return toBlob(c);
}

async function drawScene(ctx, level, x, y, w, h) {
  const snap = sceneSnapshot(level);
  const img = await svgImage(snap.inner, `0 0 ${SCENE_W} ${SCENE_H}`, w, h, 'scene');
  ctx.drawImage(img, x, y, w, h);
  const k = w / SCENE_W;
  for (const l of snap.labels) {
    const size = Math.max(16, Math.round((l.tag ? 13 : 15) * k * 1.15));
    // جای برچسب در صحنه: وسط افقی، پایین عمودی (مثل translate(-50%, -100%))
    pill(ctx, l.text, x + l.x * k, y + l.y * k - size * 0.95, size);
  }
}

// پیش‌نمایش لینک ۱۲۰۰×۶۳۰ (برای scripts/render-og.mjs): بدون آدرس سایت، چون یک تصویر برای هر دو دامنه است
export async function renderOg(level = null, count = 0) {
  await fontsReady();
  const [w, h] = FORMATS.og;
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);
  if (level) {
    const sw = 720;
    const sh = Math.round(sw * (SCENE_H / SCENE_W));
    await drawScene(ctx, level, 0, h - sh - 20, sw, sh);
    const tx = w - 60;
    const maxW = w - sw - 60;
    ctx.textAlign = 'right';
    brand(ctx, w - 60 - 170, 70, 30);
    let y = 120;
    y += textBlock(ctx, level.title, { x: tx, y, maxW, size: 64, weight: 900, color: C.accent, maxLines: 3, lh: 1.3, align: 'right' });
    y += 24;
    textBlock(ctx, 'اهرم را می‌کشی یا نه؟', { x: tx, y, maxW, size: 36, weight: 800, maxLines: 2, align: 'right' });
    font(ctx, 26, 700);
    ctx.fillStyle = C.soft;
    ctx.fillText('ببین بقیه چه کردند', tx, h - 70);
  } else {
    const heroH = 300;
    const hero = await svgImage(heroMarkup(), '0 20 900 290', Math.round(heroH * (900 / 290)), heroH);
    ctx.drawImage(hero, w / 2 - hero.width / 2, h - heroH - 10);
    textBlock(ctx, SITE, { x: w / 2, y: 40, maxW: w - 120, size: 92, weight: 900, maxLines: 1 });
    textBlock(ctx, `${fa(count)} دوراهی اخلاقی عجیب. اهرم را می‌کشی یا نه؟`, { x: w / 2, y: 190, maxW: w - 160, size: 40, weight: 700, color: C.soft, maxLines: 1 });
  }
  ctx.lineWidth = 10;
  ctx.strokeStyle = C.ink;
  roundRect(ctx, 5, 5, w - 10, h - 10, 26);
  ctx.stroke();
  return toBlob(c);
}

// ───────── جریان اشتراک‌گذاری ─────────
// item: { key, title, text, url, filename, formats: ['story', 'post'], render(format) => Promise<Blob> }
const cache = new Map();

function image(item, format) {
  const k = `${item.key}|${format}`;
  let entry = cache.get(k);
  if (!entry) {
    entry = { blob: null, promise: null };
    entry.promise = item.render(format).then((b) => (entry.blob = b));
    entry.promise.catch(() => cache.delete(k));
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    cache.set(k, entry);
  }
  return entry;
}

// تصویر را از قبل می‌سازد تا لمس دکمه بلافاصله به اشتراک‌گذاری برسد (سافاری اجازه‌ی صبر کردن نمی‌دهد)
export function prepare(item) {
  const run = () => image(item, item.formats[0]).promise.catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 600);
}

const fileOf = (item, format, blob) => new File([blob], `${item.filename}-${format}.png`, { type: 'image/png' });

// روی دسکتاپ پنجره‌ی اشتراک سیستم (کروم و اج در ویندوز و مک) گاهی بی‌صدا شکست می‌خورد یا گیر می‌کند،
// پس آنجا همیشه پنجره‌ی خودمان باز می‌شود و اشتراک سیستم فقط یک دکمه داخل آن است
export function isDesktop() {
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean' && navigator.userAgentData.mobile) return false;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  // آیپد خودش را مک معرفی می‌کند ولی لمسی است
  return !(coarse && navigator.maxTouchPoints > 0);
}

// زیر این زمان، AbortError یعنی سیستم اجازه نداده، نه اینکه کاربر لغو کرده باشد
const QUICK_ABORT_MS = 300;
// اگر پنجره‌ی سیستم تا این زمان جواب ندهد، پنجره‌ی خودمان هم زیرش باز می‌شود
const SHARE_TIMEOUT_MS = 1500;

/**
 * navigator.share با جواب قابل دیدن در همه‌ی حالت‌ها.
 * onFail وقتی صدا زده می‌شود که اشتراک رد شد، خیلی زود لغو شد یا گیر کرد (late: بعد از مهلت).
 * خروجی: Promise با 'shared' یا 'cancelled' یا 'failed'
 */
export function systemShare(data, { onFail, onLate } = {}) {
  const t0 = performance.now();
  let timer = 0;
  return new Promise((resolve) => {
    let p;
    try {
      p = Promise.resolve(navigator.share(data));
    } catch (err) {
      p = Promise.reject(err);
    }
    timer = setTimeout(() => onLate?.(), SHARE_TIMEOUT_MS);
    p.then(
      () => { clearTimeout(timer); resolve('shared'); },
      (err) => {
        clearTimeout(timer);
        if (err?.name === 'AbortError' && performance.now() - t0 >= QUICK_ABORT_MS) return resolve('cancelled');
        onFail?.(err);
        resolve('failed');
      },
    );
  });
}

// باید همزمان داخل رویداد کلیک صدا زده شود
export function share(item) {
  if (isDesktop()) return openSheet(item);
  const entry = image(item, item.formats[0]);
  if (entry.blob && navigator.canShare && navigator.share) {
    const file = fileOf(item, item.formats[0], entry.blob);
    const data = { files: [file], title: item.title, text: item.text, url: item.url };
    let ok = false;
    try { ok = navigator.canShare(data); } catch { /* ignore */ }
    if (ok) {
      // پنجره‌ای که به خاطر گیر کردن یا رد شدن اشتراک سیستم باز شده
      let fallback = null;
      const openFallback = () => {
        if (fallback && openState === fallback) return;
        openSheet(item);
        fallback = openState;
      };
      systemShare(data, { onFail: openFallback, onLate: openFallback }).then((r) => {
        if (r === 'failed') return;
        // اشتراک واقعا انجام یا توسط کاربر لغو شد؛ پنجره‌ی پشتیبان دیگر لازم نیست
        if (fallback && openState === fallback) closeSheet();
        if (r === 'shared') toast('ممنون که به اشتراک گذاشتید!');
      });
      return;
    }
  }
  openSheet(item);
}

// ───────── پنجره‌ی اشتراک ─────────
const ICONS = {
  share: '<path class="ln" d="M12 15 V4 M7.5 8.5 L12 4 L16.5 8.5"/><path class="ln" d="M7 11 H5.5 V20 H18.5 V11 H17"/>',
  download: '<path class="ln" d="M12 4 V15 M7.5 10.5 L12 15 L16.5 10.5"/><path class="ln" d="M5 19.5 H19"/>',
  link: '<path class="ln" d="M10 14 L14 10"/><path class="ln" d="M11 7.5 L13 5.5 Q16 2.8 18.7 5.3 Q21.2 8 18.5 11 L16.5 13"/><path class="ln" d="M13 16.5 L11 18.5 Q8 21.2 5.3 18.7 Q2.8 16 5.5 13 L7.5 11"/>',
  telegram: '<path class="ln" d="M3.5 11.5 L20 4.5 L17 19.5 L11 15 L9 19.5 L8.5 14 L20 4.5"/><path class="ln" d="M8.5 14 L3.5 11.5"/>',
  whatsapp: '<path class="ln" d="M4.5 19.5 L5.7 15.8 Q4 13 4.6 10 Q5.8 5 11 4.4 Q16.5 4 19 8.5 Q20.8 12.8 17.8 16.6 Q14.5 20 9.4 18.5 Z"/><path class="ln" d="M9 9 Q9 13 14.5 15 L15.5 13.6 L13.8 12.6 L13 13.3 Q11.3 12.4 10.6 10.9 L11.3 10 L10.4 8.4 Z"/>',
  x: '<path class="ln" d="M5 4.5 L19 19.5 M19 4.5 L5 19.5"/>',
  close: '<path class="ln" d="M6 6 L18 18 M18 6 L6 18"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // مرورگرهای داخل برنامه‌ها یا اجازه‌ی رد شده
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.append(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

let openState = null;

export function closeSheet() {
  if (!openState) return;
  const { node, opener, urls, onKey } = openState;
  openState = null;
  document.removeEventListener('keydown', onKey, true);
  node.classList.remove('open');
  document.body.classList.remove('sheet-open');
  setTimeout(() => node.remove(), 300);
  for (const u of urls) URL.revokeObjectURL(u);
  opener?.focus?.({ preventScroll: true });
}

export function openSheet(item) {
  closeSheet();
  const enc = encodeURIComponent;
  const msg = `${item.text}\n${item.url}`;
  const multi = item.formats.length > 1;
  const node = document.createElement('div');
  node.className = 'sheet-backdrop';
  node.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
      <button class="icon-btn sheet-close" type="button" aria-label="بستن">${icon('close')}</button>
      <h2 class="sheet-title" id="sheetTitle">اشتراک‌گذاری</h2>
      ${multi ? `<div class="sheet-tabs" role="group" aria-label="اندازه‌ی تصویر">
        <button type="button" data-format="story" aria-pressed="true">استوری</button>
        <button type="button" data-format="post" aria-pressed="false">پست</button>
      </div>` : ''}
      <div class="sheet-preview" data-format="${item.formats[0]}"><img alt="تصویر برای اشتراک‌گذاری" hidden><span class="sheet-wait">در حال ساختن تصویر…</span></div>
      <div class="sheet-actions">
        <button class="btn btn-pull sheet-native" type="button" data-act="native" hidden>${icon('share')}اشتراک با برنامه‌های سیستم</button>
        <a class="btn" data-act="download" download="${item.filename}.png" aria-disabled="true">${icon('download')}دانلود تصویر</a>
        <button class="btn" type="button" data-act="copy">${icon('link')}کپی لینک</button>
      </div>
      <div class="sheet-apps">
        <a class="app-btn" href="https://t.me/share/url?url=${enc(item.url)}&text=${enc(item.text)}" target="_blank" rel="noopener">${icon('telegram')}<span>تلگرام</span></a>
        <a class="app-btn" href="https://wa.me/?text=${enc(msg)}" target="_blank" rel="noopener">${icon('whatsapp')}<span>واتس‌اپ</span></a>
        <a class="app-btn" href="https://x.com/intent/tweet?text=${enc(item.text)}&url=${enc(item.url)}" target="_blank" rel="noopener">${icon('x')}<span>ایکس</span></a>
      </div>
      <p class="sheet-hint">برای استوری اینستاگرام، تصویر را دانلود کنید و در استوری بگذارید. اگر دانلود نشد، انگشتتان را روی تصویر نگه دارید.</p>
    </div>`;
  document.body.append(node);
  document.body.classList.add('sheet-open');
  const $ = (s) => node.querySelector(s);
  const img = $('.sheet-preview img');
  const dl = $('[data-act="download"]');
  const native = $('[data-act="native"]');
  const urls = [];
  let format = item.formats[0];
  let current = null;

  async function show(f) {
    format = f;
    $('.sheet-preview').dataset.format = f;
    for (const b of node.querySelectorAll('[data-format]')) if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.format === f));
    img.hidden = true;
    $('.sheet-wait').hidden = false;
    dl.setAttribute('aria-disabled', 'true');
    let blob;
    try {
      blob = await image(item, f).promise;
    } catch {
      $('.sheet-wait').textContent = 'ساختن تصویر ممکن نشد؛ لینک را کپی کنید.';
      return;
    }
    if (!openState || format !== f) return;
    current = blob;
    const u = URL.createObjectURL(blob);
    urls.push(u);
    img.src = u;
    img.hidden = false;
    $('.sheet-wait').hidden = true;
    dl.href = u;
    dl.download = `${item.filename}-${f}.png`;
    dl.removeAttribute('aria-disabled');
    let can = false;
    try { can = !!navigator.canShare?.({ files: [fileOf(item, f, blob)] }); } catch { /* ignore */ }
    native.hidden = !can && !navigator.share;
  }

  node.addEventListener('click', async (e) => {
    if (e.target === node || e.target.closest('.sheet-close')) return closeSheet();
    const tab = e.target.closest('button[data-format]');
    if (tab) return show(tab.dataset.format);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'download' && dl.getAttribute('aria-disabled') === 'true') e.preventDefault();
    if (act === 'copy') {
      toast((await copyText(item.url)) ? 'لینک کپی شد!' : 'کپی نشد؛ لینک را از نوار آدرس بردارید.');
    }
    if (act === 'native') {
      const data = { title: item.title, text: item.text, url: item.url };
      if (current) {
        const withFile = { ...data, files: [fileOf(item, format, current)] };
        try { if (navigator.canShare?.(withFile)) Object.assign(data, withFile); } catch { /* ignore */ }
      }
      const fail = () => toast('اشتراک‌گذاری سیستم باز نشد؛ از دکمه‌های دیگر استفاده کنید.');
      const r = await systemShare(data, { onFail: fail, onLate: () => toast('اگر پنجره‌ی سیستم باز نشد، از دکمه‌های دیگر استفاده کنید.') });
      if (r === 'shared') toast('ممنون که به اشتراک گذاشتید!');
    }
  });

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeSheet();
    } else if (e.key === 'Tab') {
      // فوکوس داخل پنجره می‌ماند
      const f = [...node.querySelectorAll('button:not([hidden]), a[href]')].filter((n) => n.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
    e.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);
  openState = { node, opener: document.activeElement, urls, onKey };
  requestAnimationFrame(() => node.classList.add('open'));
  $('.sheet-close').focus({ preventScroll: true });
  show(format);
}
