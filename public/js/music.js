// موسیقی لوفای ملایم پس‌زمینه که لحظه‌به‌لحظه با Web Audio ساخته می‌شود (بدون فایل صوتی)
// آکوردهای الکتریک‌پیانو (هفتم و نهم)، باس نرم، کیک و اسنیر برسی با سوئینگ و خش‌خش صفحه‌ی گرامافون
import { shared } from './audio.js';

const BPM = 74;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SWING = 0.62; // جای ضرب دوم هر چنگ در ضرب (۰٫۵ یعنی بدون سوئینگ)
const VOLUME = 0.3;

// هر آکورد: [باس، صداهای دست راست] به عدد MIDI
const PROGRESSIONS = [
  [[38, [53, 57, 60, 64]], [43, [53, 57, 59, 64]], [36, [52, 55, 59, 62]], [45, [55, 59, 61, 65]]], // Dm9 G13 Cmaj9 A7
  [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 66]], [38, [53, 57, 60, 64]], [36, [52, 55, 59, 62]]], // Fmaj9 Em9 Dm9 Cmaj9
  [[45, [52, 55, 59, 60]], [38, [54, 57, 60, 64]], [43, [54, 57, 59, 62]], [36, [52, 55, 59, 62]]], // Am9 D9 Gmaj9 Cmaj9
  [[41, [57, 60, 64, 67]], [41, [56, 60, 63, 67]], [40, [55, 59, 62, 66]], [45, [55, 58, 61, 64]]], // Fmaj9 Fm9 Em9 A7b9
];
// ریتم آکوردها در هر میزان (به ضرب)
const COMP = [[0], [0, 2.5], [0, 1.5, 3], [0.5, 2.5], [0, 3.5]];
const PENTA = [72, 74, 76, 79, 81, 84];

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// خش‌خش گرامافون: ضربه‌های پراکنده + هیس خیلی کم، یک بار ساخته و تکرار می‌شود
function crackleBuffer(ctx) {
  const len = Math.floor(ctx.sampleRate * 3);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * 0.012;
    if (Math.random() < 0.0004) {
      const amp = rnd(0.2, 0.9) * (Math.random() < 0.5 ? -1 : 1);
      for (let k = 0; k < 18 && i + k < len; k++) d[i + k] += amp * Math.exp(-k / 3);
    }
  }
  return buf;
}

// موتور موسیقی: روی هر AudioContext کار می‌کند (برای تست با OfflineAudioContext هم)
export function createLofi(ctx, dest, noise) {
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 2400;
  warm.Q.value = 0.4;
  warm.connect(out).connect(dest);

  // الکتریک‌پیانو با ترمولوی ملایم و کمی اکو
  const ep = ctx.createGain();
  ep.gain.value = 0.9;
  const trem = ctx.createOscillator();
  const tremDepth = ctx.createGain();
  trem.frequency.value = 3.6;
  tremDepth.gain.value = 0.12;
  trem.connect(tremDepth).connect(ep.gain);
  const echo = ctx.createDelay(1);
  echo.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.22;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 1400;
  ep.connect(warm);
  ep.connect(echo).connect(echoTone).connect(fb).connect(echo);
  echoTone.connect(warm);

  const drums = ctx.createGain();
  drums.gain.value = 0.8;
  drums.connect(warm);

  const vinyl = ctx.createBufferSource();
  vinyl.buffer = crackleBuffer(ctx);
  vinyl.loop = true;
  const vinylTone = ctx.createBiquadFilter();
  vinylTone.type = 'bandpass';
  vinylTone.frequency.value = 2600;
  vinylTone.Q.value = 0.5;
  const vinylGain = ctx.createGain();
  vinylGain.gain.value = 0.16;
  vinyl.connect(vinylTone).connect(vinylGain).connect(out);

  const sources = [trem, vinyl];

  function epNote(t, midi, vel, dur) {
    const f = mtof(midi);
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modAmt = ctx.createGain();
    const amp = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f; // نسبت ۱ به ۱ صدای گرم «رودز» می‌دهد
    modAmt.gain.setValueAtTime(f * 1.1 * vel, t);
    modAmt.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.45);
    mod.connect(modAmt).connect(car.frequency);
    const peak = 0.05 * vel;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(peak * 0.35, t + 1.2);
    amp.gain.setTargetAtTime(0.0001, t + dur, 0.18);
    car.connect(amp).connect(ep);
    const end = t + dur + 1;
    car.start(t);
    mod.start(t);
    car.stop(end);
    mod.stop(end);
  }

  function bass(t, midi, dur) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    f.type = 'lowpass';
    f.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.7);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.08);
    o.connect(f).connect(g).connect(warm);
    o.start(t);
    o.stop(t + dur + 0.6);
  }

  function kick(t, vel = 1) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(105, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(drums);
    o.start(t);
    o.stop(t + 0.4);
  }

  function hiss(t, { freq, type, q = 0.7, peak, decay }) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f).connect(g).connect(drums);
    s.start(t, Math.random() * 1.2);
    s.stop(t + decay + 0.05);
  }
  const snare = (t, vel = 1) => hiss(t, { freq: 1700, type: 'bandpass', q: 0.6, peak: 0.16 * vel, decay: 0.32 });
  const hat = (t, vel = 1) => hiss(t, { freq: 7000, type: 'highpass', peak: 0.04 * vel, decay: 0.06 });

  function melodyNote(t, midi, dur) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ep);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // زمان واقعی یک موقعیت در میزان (به ضرب)، با سوئینگ روی چنگ‌های دوم
  const at = (barT, beatPos) => {
    const beat = Math.floor(beatPos);
    const frac = beatPos - beat;
    return barT + (beat + (Math.abs(frac - 0.5) < 0.01 ? SWING : frac)) * BEAT + rnd(-0.008, 0.008);
  };

  let bar = 0;
  let prog = PROGRESSIONS[0];
  let section = { drums: true, melody: false, lift: 0 };

  // هر ۸ میزان: پیشرفت آکورد تازه، ریتم و تزیین تازه تا تکراری نشود
  function newSection() {
    const others = PROGRESSIONS.filter((p) => p !== prog);
    prog = bar === 0 ? PROGRESSIONS[0] : pick(others);
    section = { drums: bar === 0 ? false : Math.random() > 0.12, melody: bar > 0 && Math.random() < 0.6, lift: Math.random() < 0.35 ? 12 : 0 };
  }

  function scheduleBar(t) {
    if (bar % 8 === 0) newSection();
    const inSection = bar % 8;
    const [root, voicing] = prog[inSection % 4];
    const second = inSection >= 4;
    // در نیمه‌ی دوم بالاترین صدا یک اکتاو بالا می‌رود (اگر این بخش «لیفت» داشته باشد)
    const notes = voicing.map((n, i) => (second && i === voicing.length - 1 ? n + section.lift : n));
    const comp = pick(COMP);
    comp.forEach((pos, i) => {
      const start = at(t, pos);
      const dur = ((comp[i + 1] ?? 4) - pos) * BEAT;
      const vel = i === 0 ? rnd(0.85, 1) : rnd(0.55, 0.75);
      notes.forEach((n, k) => epNote(start + k * 0.014, n, vel, dur));
    });

    bass(at(t, 0), root, BEAT * 1.8);
    if (Math.random() < 0.7) bass(at(t, 2.5), Math.random() < 0.3 ? root + 7 : root, BEAT * 1.3);

    const drumsOn = section.drums && !(inSection === 7 && Math.random() < 0.3);
    if (drumsOn) {
      kick(at(t, 0));
      kick(at(t, 2.5), 0.8);
      if (Math.random() < 0.25) kick(at(t, 1.5), 0.55);
      snare(at(t, 1), rnd(0.8, 1));
      snare(at(t, 3), rnd(0.8, 1));
      for (let e = 0; e < 8; e++) hat(at(t, e / 2), e % 2 ? rnd(0.4, 0.6) : rnd(0.7, 1));
    } else if (bar > 0) {
      for (let e = 0; e < 8; e += 2) hat(at(t, e / 2), 0.4);
    }

    if (section.melody && second) {
      for (let e = 0; e < 8; e++) {
        if (Math.random() < 0.16) melodyNote(at(t, e / 2), pick(PENTA), BEAT * rnd(0.6, 1.4));
      }
    }
    bar += 1;
  }

  let nextBar = 0;
  return {
    out,
    start(t) {
      nextBar = t + 0.05;
      for (const s of sources) s.start(t);
    },
    // همه‌ی میزان‌هایی که تا زمان until شروع می‌شوند را زمان‌بندی می‌کند
    scheduleUntil(until) {
      // اگر تایمر مدتی عقب افتاده بود، میزان‌های ازدست‌رفته یک‌جا پخش نمی‌شوند
      if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.05;
      while (nextBar < until) {
        scheduleBar(nextBar);
        nextBar += BAR;
      }
    },
    fade(to, t, time) {
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(Math.max(to, 0.0001), t + time);
    },
    stop(t) {
      for (const s of sources) {
        try { s.stop(t); } catch { /* ignore */ }
      }
      setTimeout(() => out.disconnect(), Math.max(0, (t - ctx.currentTime) * 1000) + 200);
    },
  };
}

// ───────── روشن و خاموش کردن در صفحه ─────────
let enabled = true;
try {
  enabled = localStorage.getItem('sozanban:music') !== 'off';
} catch { /* ignore */ }

let engine = null;
let timer = 0;

function tick() {
  const ctx = shared.ctx;
  if (!engine || !ctx) return;
  // میزان‌ها کمی جلوتر زمان‌بندی می‌شوند؛ تایمر کم‌تکرار برای مصرف کم باتری
  if (ctx.state === 'running') engine.scheduleUntil(ctx.currentTime + 1.2);
}

function start() {
  if (engine || !enabled || !shared.unlocked) return;
  const ctx = shared.create();
  if (!ctx) return;
  engine = createLofi(ctx, shared.musicBus, shared.noise);
  const t = ctx.currentTime;
  engine.start(t);
  engine.fade(VOLUME, t + 0.05, 3);
  tick();
  timer = setInterval(tick, 400);
}

function stop() {
  if (!engine) return;
  const ctx = shared.ctx;
  const e = engine;
  engine = null;
  clearInterval(timer);
  const t = ctx.currentTime;
  e.fade(0.0001, t, 1.2);
  e.stop(t + 1.3);
}

shared.wants(() => enabled);
// موسیقی فقط بعد از اولین لمس یا کلیک کاربر شروع می‌شود (قاعده‌ی مرورگرها)
shared.onUnlock(start);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

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
