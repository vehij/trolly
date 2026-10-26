import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLofi, BAR } from '../public/js/lofi.js';

// کانتکست ساختگی: فقط زمان شروع نوسان‌سازها و منبع‌ها را ثبت می‌کند
function fakeCtx() {
  const starts = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {}, cancelScheduledValues() {},
  });
  const node = (extra = {}) => ({
    connect: (n) => n, disconnect() {},
    gain: param(), frequency: param(), Q: param(), delayTime: param(),
    ...extra,
  });
  const source = () => node({ start: (t = 0) => starts.push(t), stop() {} });
  return {
    currentTime: 0,
    sampleRate: 8000,
    starts,
    createGain: () => node(),
    createBiquadFilter: () => node(),
    createDelay: () => node(),
    createOscillator: source,
    createBufferSource: source,
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  };
}

test('موسیقی: اولین نت‌ها همان لحظه‌ی شروع زمان‌بندی می‌شوند', () => {
  const ctx = fakeCtx();
  ctx.currentTime = 3;
  const e = createLofi(ctx, ctx.createGain(), () => ctx.createBuffer(1, 10));
  e.start(3);
  ctx.starts.length = 0;
  e.scheduleUntil(3 + 1.2);
  assert.ok(ctx.starts.length > 0, 'هیچ نتی زمان‌بندی نشد');
  assert.ok(Math.min(...ctx.starts) < 3 + 0.1, `اولین نت دیر است: ${Math.min(...ctx.starts) - 3}`);
});

test('موسیقی: بعد از مکث طولانی نت‌های عقب‌افتاده یک‌جا پخش نمی‌شوند', () => {
  const ctx = fakeCtx();
  const e = createLofi(ctx, ctx.createGain(), () => ctx.createBuffer(1, 10));
  e.start(0);
  e.scheduleUntil(1.2);
  ctx.starts.length = 0;
  ctx.currentTime = 120; // مثلا کانتکست در iOS حالت interrupted داشت و زمانش جلو رفت
  e.scheduleUntil(121.2);
  assert.ok(ctx.starts.length > 0);
  assert.ok(ctx.starts.every((t) => t >= 120), 'نتی برای زمان گذشته زمان‌بندی شد');
  assert.ok(ctx.starts.every((t) => t < 121.2 + BAR), 'بیشتر از یک میزان جلوتر زمان‌بندی شد');
});

test('موسیقی: اگر زمان کانتکست عقب برود، زمان‌بند منتظر آینده‌ی دور نمی‌ماند', () => {
  const ctx = fakeCtx();
  ctx.currentTime = 500;
  const e = createLofi(ctx, ctx.createGain(), () => ctx.createBuffer(1, 10));
  e.start(500);
  e.scheduleUntil(501.2);
  ctx.starts.length = 0;
  ctx.currentTime = 0.5;
  e.scheduleUntil(1.7);
  assert.ok(ctx.starts.length > 0, 'بعد از عقب رفتن زمان موسیقی ساکت ماند');
  assert.ok(ctx.starts.every((t) => t >= 0.5 && t < 1.7 + BAR));
});

test('موسیقی: شماره‌ی میزان بعد از ساخت دوباره ادامه پیدا می‌کند', () => {
  const ctx = fakeCtx();
  const e = createLofi(ctx, ctx.createGain(), () => ctx.createBuffer(1, 10), { bar: 5 });
  e.start(0);
  e.scheduleUntil(BAR * 2);
  assert.equal(e.bar, 7);
});
