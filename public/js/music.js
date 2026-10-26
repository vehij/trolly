// موسیقی لوفای پس‌زمینه: روشن و خاموش کردن، مکث در پس‌زمینه و برگشتن بعد از آن
// خود موتور موسیقی در lofi.js است
import { shared } from './audio.js';
import { createLofi } from './lofi.js';

const VOLUME = 0.3;
const FADE_IN = 1; // ثانیه؛ نت‌های اول بلافاصله زمان‌بندی می‌شوند و فقط حجم صدا کم‌کم بالا می‌آید

let enabled = true;
try {
  enabled = localStorage.getItem('sozanban:music') !== 'off';
} catch { /* ignore */ }

let engine = null;
let timer = 0;
let bar = 0; // شماره‌ی میزان، تا بعد از مکث موسیقی از همان‌جا ادامه پیدا کند

function tick() {
  const ctx = shared.ctx;
  if (!engine || !ctx || engine.ctx !== ctx) return;
  // میزان‌ها کمی جلوتر زمان‌بندی می‌شوند؛ تایمر کم‌تکرار برای مصرف کم باتری.
  // وقتی کانتکست معلق است زمانش جلو نمی‌رود، پس بیشتر از همین ۱٫۲ ثانیه جلو نمی‌افتد
  engine.scheduleUntil(ctx.currentTime + 1.2);
}

function start() {
  if (engine || !enabled || !shared.unlocked || document.hidden) return;
  const ctx = shared.create();
  if (!ctx || ctx.state === 'closed') return;
  const e = createLofi(ctx, shared.musicBus, () => shared.noise, { bar });
  e.ctx = ctx;
  engine = e;
  const t = ctx.currentTime;
  e.start(t);
  e.fade(VOLUME, t, FADE_IN);
  // میزان اول همین حالا، داخل همان لمس، زمان‌بندی می‌شود؛ منتظر running شدن کانتکست نمی‌ماند
  tick();
  timer = setInterval(tick, 400);
}

// قطع فوری (رفتن به پس‌زمینه یا عوض شدن کانتکست): نت‌های صف‌شده هم بی‌صدا می‌شوند
function halt() {
  if (!engine) return;
  const e = engine;
  engine = null;
  clearInterval(timer);
  bar = e.bar;
  e.stop();
}

function stop() {
  if (!engine) return;
  const e = engine;
  engine = null;
  clearInterval(timer);
  bar = e.bar;
  const t = e.ctx.currentTime;
  e.fade(0.0001, t, 1.2);
  e.stop(t + 1.3);
}

shared.wants(() => enabled);
// موسیقی فقط بعد از اولین لمس یا کلیک کاربر شروع می‌شود (قاعده‌ی مرورگرها)
shared.onUnlock(start);
// کانتکست تازه ساخته شد (قبلی بسته شد یا گیر کرد): موتور روی کانتکست جدید از نو ساخته می‌شود
shared.onReset(() => {
  halt();
  start();
});
// کانتکست دوباره راه افتاد: زمان‌بند از ctx.currentTime ادامه می‌دهد
shared.onRunning(() => {
  if (engine) tick();
  else start();
});
function hide() {
  halt();
}
function show() {
  if (!document.hidden) start();
}
document.addEventListener('visibilitychange', () => (document.hidden ? hide() : show()));
window.addEventListener('pagehide', hide);
window.addEventListener('pageshow', show);

export function isEnabled() {
  return enabled;
}

export function setEnabled(on) {
  enabled = on;
  try {
    localStorage.setItem('sozanban:music', on ? 'on' : 'off');
  } catch { /* ignore */ }
  if (on) {
    shared.unlock();
    start();
  } else {
    stop();
    shared.release();
  }
}
