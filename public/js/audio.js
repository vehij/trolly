// افکت‌های صوتی که همه با Web Audio ساخته می‌شوند (بدون فایل صوتی)
let ctx = null;
let master = null;
let musicBus = null;
let noiseBuf = null;
let rumble = null;
let enabled = true;
let unlocked = false;
let silent = null;
let watch = 0;
const unlockListeners = new Set();
const resetListeners = new Set();
const runningListeners = new Set();
const wantsAudio = new Set([() => enabled]);

try {
  enabled = localStorage.getItem('sozanban:sound') !== 'off';
} catch { /* ignore */ }

// آیفون و آیپد (آیپد جدید خودش را مک معرفی می‌کند)
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const anyAudio = () => [...wantsAudio].some((f) => f());
const notify = (set) => {
  for (const fn of set) {
    try { fn(); } catch { /* ignore */ }
  }
};

// کانتکست و گراف صدا (حجم اصلی، گذرگاه موسیقی) را می‌سازد؛ بافرهای سنگین بعداً و فقط وقت نیاز ساخته می‌شوند
function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let c;
  try {
    c = new AC({ latencyHint: 'playback' });
  } catch {
    try { c = new AC(); } catch { return null; }
  }
  ctx = c;
  master = c.createGain();
  master.gain.value = 0.55;
  master.connect(c.destination);
  musicBus = c.createGain();
  musicBus.connect(c.destination);
  noiseBuf = null;
  rumble = null;
  duckUntil = 0;
  // iOS بعد از تماس، اشتراک‌گذاری یا رفتن به برنامه‌ی دیگر حالت غیراستاندارد interrupted می‌دهد
  c.addEventListener('statechange', () => {
    if (c === ctx) onState();
  });
  return c;
}

function create() {
  return ctx || build();
}

// کانتکست بسته شده یا گیر کرده است: کانتکست تازه با همان تنظیمات صدا ساخته می‌شود
function rebuild() {
  const old = ctx;
  clearTimeout(watch);
  watch = 0;
  ctx = null;
  if (!build()) {
    ctx = old;
    return false;
  }
  if (old && old.state !== 'closed') old.close().catch(() => {});
  notify(resetListeners);
  return true;
}

function noiseBuffer() {
  if (!noiseBuf && ctx) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// پخش یک بافر خالی، ترفند قدیمی باز کردن قفل صدا در iOS
function kick() {
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

function ensure() {
  if (!enabled) return null;
  if (!create()) return null;
  // بیرون از لمس کاربر resume در iOS کاری نمی‌کند؛ بعد از اولین لمس (unlock) دوباره امتحان می‌شود
  if (ctx.state !== 'running' && unlocked) wake(false);
  return ctx;
}

// iOS صدای Web Audio را با کلید سکوت گوشی قطع می‌کند. با نوع جلسه‌ی «playback» (سافاری ۱۷ به بعد)
// یا در نسخه‌های قدیمی‌تر با پخش یک فایل بی‌صدای کوتاه در حلقه، صدا مثل پخش ویدیو شنیده می‌شود.
function playbackSession() {
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = 'playback';
      return;
    }
  } catch { /* ignore */ }
  if (!isIOS) return;
  if (!silent) {
    silent = document.createElement('audio');
    silent.src = '/audio/silence.wav';
    silent.loop = true;
    silent.preload = 'auto';
    silent.setAttribute('playsinline', '');
    silent.setAttribute('aria-hidden', 'true');
  }
  if (silent.paused) silent.play().catch(() => {});
}

// صدا را اگر لازم باشد دوباره راه می‌اندازد. gesture یعنی داخل لمس یا کلیک کاربر صدا زده شده
// (در iOS فقط آنجا resume جواب می‌دهد)؛ بیرون از لمس هم امتحان می‌شود چون بعضی مرورگرها اجازه می‌دهند
function wake(gesture) {
  if (!unlocked || !ctx || document.hidden || !anyAudio()) return;
  if (gesture) playbackSession();
  if (ctx.state === 'closed' && !rebuild()) return;
  // هر حالتی غیر از running (suspended، interrupted در iOS) یعنی باید resume شود
  if (ctx.state === 'running') return;
  const c = ctx;
  c.resume().catch(() => {});
  if (!gesture) return;
  kick();
  if (watch) return;
  // اگر resume داخل لمس هم بعد از ۸۰۰ میلی‌ثانیه جواب نداد، کانتکست گیر کرده و از نو ساخته می‌شود
  watch = setTimeout(() => {
    watch = 0;
    if (c !== ctx || c.state === 'running' || document.hidden) return;
    if (rebuild()) ctx.resume().catch(() => {});
  }, 800);
}

function onState() {
  if (ctx.state === 'running') {
    clearTimeout(watch);
    watch = 0;
    notify(runningListeners);
  } else if (!document.hidden) {
    // مثلا پایان وقفه‌ی iOS: اگر مرورگر اجازه بدهد همین حالا برمی‌گردد، وگرنه با لمس بعدی
    wake(false);
  }
}

// باید همزمان (synchronous) داخل رویداد لمس/کلیک صدا زده شود
function unlock() {
  if (!anyAudio() || !create()) return;
  if (unlocked) return wake(true);
  unlocked = true;
  wake(true);
  notify(unlockListeners);
  // بافر نویز بعد از لمس و بیرون از آن ساخته می‌شود تا شروع موسیقی معطلش نشود
  setTimeout(noiseBuffer, 300);
}
// این شنونده‌ها روی همه‌ی لمس‌ها می‌مانند، نه فقط اولی: اگر iOS صدا را قطع کرد
// (تماس، اشتراک‌گذاری، رفتن به پس‌زمینه یا قفل صفحه) با لمس بعدی برمی‌گردد
for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) {
  window.addEventListener(type, unlock, { capture: true, passive: true });
}

// در پس‌زمینه کل صدا معلق می‌شود (موسیقی هم مکث می‌کند) و در برگشت دوباره راه می‌افتد
function sleep() {
  clearTimeout(watch);
  watch = 0;
  silent?.pause();
  if (ctx?.state === 'running') ctx.suspend().catch(() => {});
}
function revive() {
  if (document.hidden || !unlocked) return;
  wake(false);
  if (silent && anyAudio() && !navigator.audioSession) silent.play().catch(() => {});
}
document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : revive()));
window.addEventListener('pagehide', sleep);
// pageshow برای برگشت از bfcache (persisted) هم صدا زده می‌شود
window.addEventListener('pageshow', revive);
window.addEventListener('focus', revive);

// برای موسیقی: کانتکست مشترک، گذرگاه موسیقی و وضعیت قفل
export const shared = {
  get ctx() { return ctx; },
  get musicBus() { return musicBus; },
  get noise() { return noiseBuffer(); },
  get unlocked() { return unlocked; },
  create,
  unlock,
  onUnlock(fn) { unlockListeners.add(fn); },
  // کانتکست تازه جای قبلی را گرفت
  onReset(fn) { resetListeners.add(fn); },
  // کانتکست دوباره در حالت running است
  onRunning(fn) { runningListeners.add(fn); },
  wants(fn) { wantsAudio.add(fn); },
  release() {
    if (!anyAudio()) silent?.pause();
  },
};

// وقتی افکتی پخش می‌شود موسیقی کمی آرام‌تر می‌شود
let duckUntil = 0;
function duck(dur = 0.5, depth = 0.5) {
  if (!musicBus) return;
  const t = ctx.currentTime;
  const g = musicBus.gain;
  const end = Math.max(duckUntil, t + dur);
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(depth, t + 0.04);
  g.setValueAtTime(depth, end);
  g.linearRampToValueAtTime(1, end + 0.7);
  duckUntil = end;
}

const now = () => ctx.currentTime;

function env(node, t, a, peak, decay, end = 0.0001) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + a);
  node.gain.exponentialRampToValueAtTime(end, t + a + decay);
}

function tone({ freq = 440, to, type = 'sine', dur = 0.2, vol = 0.3, attack = 0.005, delay = 0 }) {
  const t = now() + delay;
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(gn, t, attack, vol, dur);
  o.connect(gn).connect(master);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.3, filter = 'lowpass', freq = 1200, to, q = 1, delay = 0 }) {
  const t = now() + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const gn = ctx.createGain();
  env(gn, t, 0.004, vol, dur);
  src.connect(f).connect(gn).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

const SOUNDS = {
  click: () => tone({ freq: 660, to: 880, type: 'triangle', dur: 0.06, vol: 0.12 }),
  hover: () => tone({ freq: 1200, type: 'sine', dur: 0.03, vol: 0.03 }),
  lever: () => {
    noise({ dur: 0.08, vol: 0.4, filter: 'bandpass', freq: 2400, q: 3 });
    tone({ freq: 140, to: 70, type: 'square', dur: 0.12, vol: 0.12, delay: 0.03 });
    noise({ dur: 0.05, vol: 0.3, filter: 'highpass', freq: 3000, delay: 0.14 });
  },
  rattle: () => noise({ dur: 0.05, vol: 0.25, filter: 'bandpass', freq: 3200, q: 4 }),
  stamp: () => { noise({ dur: 0.12, vol: 0.6, freq: 600, to: 100 }); tone({ freq: 90, to: 50, dur: 0.15, vol: 0.35 }); },
  bell: () => {
    for (const d of [0, 0.22]) {
      tone({ freq: 1568, type: 'sine', dur: 0.7, vol: 0.12, delay: d });
      tone({ freq: 2350, type: 'sine', dur: 0.4, vol: 0.05, delay: d });
      tone({ freq: 3920, type: 'triangle', dur: 0.15, vol: 0.02, delay: d });
    }
  },
  clack: () => {
    noise({ dur: 0.035, vol: 0.18, filter: 'bandpass', freq: 1800, q: 2 });
    noise({ dur: 0.035, vol: 0.14, filter: 'bandpass', freq: 1500, q: 2, delay: 0.07 });
  },
  splat: (o = {}) => {
    noise({ dur: 0.22, vol: 0.55, freq: 900, to: 120 });
    tone({ freq: 120, to: 45, dur: 0.18, vol: 0.4 });
    if (o.human) tone({ freq: 700 + Math.random() * 300, to: 380, type: 'triangle', dur: 0.18, vol: 0.06, delay: 0.02 });
  },
  bump: () => { tone({ freq: 220, to: 160, type: 'triangle', dur: 0.1, vol: 0.2 }); tone({ freq: 900, to: 620, type: 'sine', dur: 0.12, vol: 0.06, delay: 0.05 }); },
  clank: () => { tone({ freq: 420, to: 300, type: 'square', dur: 0.2, vol: 0.08 }); tone({ freq: 1270, type: 'triangle', dur: 0.3, vol: 0.08 }); noise({ dur: 0.1, vol: 0.3, filter: 'highpass', freq: 2500 }); },
  glass: () => { noise({ dur: 0.25, vol: 0.4, filter: 'highpass', freq: 4000 }); for (let i = 0; i < 5; i++) tone({ freq: 2500 + Math.random() * 2500, type: 'sine', dur: 0.12, vol: 0.05, delay: i * 0.03 }); },
  coins: () => { noise({ dur: 0.12, vol: 0.3, freq: 800, to: 200 }); for (let i = 0; i < 7; i++) tone({ freq: 1800 + Math.random() * 1600, type: 'triangle', dur: 0.12, vol: 0.06, delay: 0.05 + i * 0.045 }); },
  crunch: () => { for (let i = 0; i < 4; i++) noise({ dur: 0.04, vol: 0.3, filter: 'bandpass', freq: 2500 + i * 300, q: 2, delay: i * 0.03 }); },
  paper: () => noise({ dur: 0.3, vol: 0.3, filter: 'highpass', freq: 3000, to: 6000 }),
  meow: () => tone({ freq: 600, to: 950, type: 'sawtooth', dur: 0.32, vol: 0.05 }),
  honk: () => { tone({ freq: 400, type: 'square', dur: 0.14, vol: 0.06 }); tone({ freq: 500, type: 'square', dur: 0.14, vol: 0.05 }); },
  woof: () => { tone({ freq: 330, to: 170, type: 'sawtooth', dur: 0.12, vol: 0.07 }); tone({ freq: 300, to: 160, type: 'sawtooth', dur: 0.14, vol: 0.06, delay: 0.2 }); },
  growl: () => { noise({ dur: 0.55, vol: 0.35, freq: 320, to: 160 }); tone({ freq: 95, to: 70, type: 'sawtooth', dur: 0.5, vol: 0.05 }); },
  splash: () => { noise({ dur: 0.35, vol: 0.35, filter: 'bandpass', freq: 1800, to: 500, q: 1.2 }); tone({ freq: 700, to: 300, type: 'sine', dur: 0.12, vol: 0.06 }); },
  thud: () => { tone({ freq: 160, to: 60, dur: 0.18, vol: 0.4 }); noise({ dur: 0.08, vol: 0.2, freq: 500 }); },
  boom: () => { noise({ dur: 1.4, vol: 0.9, freq: 1800, to: 40 }); tone({ freq: 80, to: 25, dur: 1, vol: 0.6 }); },
  pop: () => tone({ freq: 500, to: 1200, type: 'sine', dur: 0.09, vol: 0.12 }),
  whoosh: () => noise({ dur: 0.45, vol: 0.18, filter: 'bandpass', freq: 400, to: 2500, q: 0.8 }),
  result: () => [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.07, delay: i * 0.07 })),
  page: () => noise({ dur: 0.25, vol: 0.12, filter: 'bandpass', freq: 1200, to: 3200, q: 0.7 }),
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.08, delay: i * 0.11 })),
  'rumble-start': (o = {}) => {
    stopRumble();
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 160 + 120 * (o.speed || 1);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.35, t + 0.6);
    src.connect(f).connect(gn).connect(master);
    src.start(t);
    rumble = { src, gn };
    duck(8, 0.6);
  },
  'rumble-stop': () => stopRumble(),
};

function stopRumble() {
  if (!rumble || !ctx) return;
  const { src, gn } = rumble;
  rumble = null;
  const t = now();
  gn.gain.cancelScheduledValues(t);
  gn.gain.setValueAtTime(Math.max(gn.gain.value, 0.0001), t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.stop(t + 0.4);
  if (musicBus) {
    duckUntil = 0;
    duck(0.3, 0.6);
  }
}

export function play(name, opts) {
  if (!enabled) return;
  if (!ensure()) return;
  // پیش از اولین لمس یا در پس‌زمینه کانتکست معلق است؛ صداهای صف‌شده نباید بعداً یک‌جا پخش شوند
  if (ctx.state !== 'running' && (!unlocked || document.hidden)) return;
  try {
    SOUNDS[name]?.(opts);
    if (name !== 'hover' && !name.startsWith('rumble')) duck(name === 'boom' ? 1.4 : 0.45);
  } catch { /* صدا نباید بازی را خراب کند */ }
}

export function isEnabled() {
  return enabled;
}

export function setEnabled(on) {
  enabled = on;
  try {
    localStorage.setItem('sozanban:sound', on ? 'on' : 'off');
  } catch { /* ignore */ }
  if (!on) {
    stopRumble();
    shared.release();
  } else {
    unlock();
    ensure();
  }
}
