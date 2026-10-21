// افکت‌های صوتی که همه با Web Audio ساخته می‌شوند (بدون فایل صوتی)
let ctx = null;
let master = null;
let noiseBuf = null;
let rumble = null;
let enabled = true;

try {
  enabled = localStorage.getItem('sozanban:sound') !== 'off';
} catch { /* ignore */ }

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
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
  src.buffer = noiseBuf;
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
  squeak: () => tone({ freq: 1400, to: 2200, type: 'sine', dur: 0.08, vol: 0.07 }),
  meow: () => tone({ freq: 600, to: 950, type: 'sawtooth', dur: 0.32, vol: 0.05 }),
  honk: () => { tone({ freq: 400, type: 'square', dur: 0.14, vol: 0.06 }); tone({ freq: 500, type: 'square', dur: 0.14, vol: 0.05 }); },
  scratch: () => { noise({ dur: 0.18, vol: 0.3, filter: 'bandpass', freq: 900, to: 2400, q: 6 }); noise({ dur: 0.15, vol: 0.25, filter: 'bandpass', freq: 2400, to: 700, q: 6, delay: 0.18 }); },
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
    src.buffer = noiseBuf;
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
}

export function play(name, opts) {
  if (!enabled) return;
  if (!ensure()) return;
  try {
    SOUNDS[name]?.(opts);
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
  if (!on) stopRumble();
  else ensure();
}
