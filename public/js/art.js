// کتابخانه‌ی تصویرسازی وکتور خطی — همه‌چیز با دست و به صورت SVG ساخته می‌شود.
// قرارداد: پای هر آیتم روی (0,0) است و x مرکز آن. رنگ‌ها از متغیرهای CSS می‌آیند.

export const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const p = (d, c = 'ln') => `<path class="${c}" d="${d}"/>`;
const circ = (x, y, r, c = 'sh') => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
const ell = (x, y, rx, ry, c = 'sh') => `<ellipse class="${c}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
const rect = (x, y, w, h, rx = 0, c = 'sh') => `<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
const txt = (x, y, s, size = 10, c = 'tx') =>
  `<text class="${c}" x="${x}" y="${y}" font-size="${size}" text-anchor="middle" direction="rtl">${s}</text>`;
// اگر هم transform و هم کلاس (که ممکن است انیمیشن CSS داشته باشد) داده شود، گروه‌ها تو در تو می‌شوند
// تا انیمیشن CSS جای transform اصلی را نگیرد
const g = (inner, t = '', c = '') => {
  if (t && c) return `<g transform="${t}"><g class="${c}">${inner}</g></g>`;
  return `<g${c ? ` class="${c}"` : ''}${t ? ` transform="${t}"` : ''}>${inner}</g>`;
};

// ───────────────────────── سر و صورت ─────────────────────────
function face(mood) {
  const eyes = p('M-3.2 0 L-3.2 0.2 M3.2 0 L3.2 0.2', 'ln eye');
  switch (mood) {
    case 'happy':
      return eyes + p('M-3.2 3.6 Q0 6.6 3.2 3.6');
    case 'smug':
      return p('M-4.6 -0.4 L-1.8 -0.4 M1.8 -0.4 L4.6 -0.4', 'ln') + p('M-2.6 4.4 Q1 6 3.6 3');
    case 'sleep':
      return p('M-4.6 0 Q-3.2 1.6 -1.8 0 M1.8 0 Q3.2 1.6 4.6 0') + p('M-1.6 4.6 Q0 5.4 1.6 4.6');
    case 'wide':
      return circ(-3.4, 0, 2.4) + circ(3.4, 0, 2.4) + circ(-3.4, 0.3, 0.9, 'ink') + circ(3.4, 0.3, 0.9, 'ink') + p('M-2 5 L2 5');
    case 'neutral':
      return eyes + p('M-2.4 4.6 L2.4 4.6');
    case 'warm':
      return p('M-4.8 0.6 Q-3.2 -1.2 -1.6 0.6 M1.6 0.6 Q3.2 -1.2 4.8 0.6') + p('M-2.8 4 Q0 6.4 2.8 4') + circ(-5.6, 3.4, 1.7, 'blush') + circ(5.6, 3.4, 1.7, 'blush');
    case 'worried':
      return eyes + p('M-5 -3.8 L-1.8 -2.8 M5 -3.8 L1.8 -2.8') + p('M-2.6 5 Q0 3.4 2.6 5');
    case 'scared':
    default:
      return eyes + p('M-5.2 -4 L-1.8 -3 M5.2 -4 L1.8 -3') + ell(0, 4.6, 1.7, 2.1, 'ink mouth');
  }
}

function headShape({ hair = 'short', mood = 'scared', facial, glasses, shades, gray, headphones }) {
  const hc = gray ? 'hair gray' : 'hair';
  let back = '';
  let front = '';
  let skull = circ(0, 0, 9, 'sh skin');
  switch (hair) {
    case 'long':
      back = p('M-10 -1 Q-12 12 -8.5 15 L8.5 15 Q12 12 10 -1 Q10 -12 0 -12 Q-10 -12 -10 -1Z', hc);
      front = p('M-9 -2 Q-3 -9 3 -8.4 Q8 -7.6 9 -2 Q9.4 -11 0 -11 Q-9.4 -11 -9 -2Z', hc);
      break;
    case 'curly':
      front = [[-8, -4], [-5.5, -8.5], [-1, -10.4], [3.6, -9.6], [7.4, -6.4], [9, -2]]
        .map(([x, y]) => circ(x, y, 3.4, hc)).join('');
      break;
    case 'bun':
      front = circ(0, -12, 4, hc) + p('M-9 -2 Q-9 -10.5 0 -10.5 Q9 -10.5 9 -2 Q5 -7 0 -6.5 Q-5 -7 -9 -2Z', hc);
      break;
    case 'spiky':
      front = p('M-9 -1 L-9.5 -8 L-6 -7 L-4.5 -12 L-1 -8.5 L2 -12.5 L4 -8 L8 -10 L7.6 -5 L9 -1 Q4 -6 -9 -1Z', hc);
      break;
    case 'bald':
      front = p('M-9 1 Q-10 -3 -8 -5.5 M9 1 Q10 -3 8 -5.5', gray ? 'ln thick' : 'ln thick') + p('M-3 -6.6 Q0 -7.6 2 -6.8', 'ln thin');
      break;
    case 'ponytail':
      back = p('M7 -7 Q19 -6 18 7 Q16 13 12 15 Q14 6 8 0Z', hc);
      front = p('M-9 -2 Q-9 -11.4 0 -11.4 Q9 -11.4 9 -2 Q4 -8.6 -3 -6.6 Q-6 -5.6 -9 -2Z', hc) + circ(8.4, -6.4, 2.2, 'sh f-accent');
      break;
    case 'bob':
      back = p('M-10.5 -1 Q-12 9 -9.5 9.6 L9.5 9.6 Q12 9 10.5 -1 Q10.5 -12.4 0 -12.4 Q-10.5 -12.4 -10.5 -1Z', hc);
      front = p('M-9.6 -1.6 Q-9 -10.6 0 -10.6 Q9 -10.6 9.6 -1.6 Q6 -4 1 -5.6 Q-4 -3.6 -9.6 -1.6Z', hc);
      break;
    case 'cap':
      front = p('M-9.6 -3.4 Q-10 -14.5 0 -14.5 Q10 -14.5 9.6 -3.4Z', 'sh f-navy') + p('M-12.5 -3.4 L12.5 -3.4', 'ln thick') + circ(0, -9, 2, 'sh f-gold');
      break;
    case 'helmet':
      front = p('M-10.4 -2.6 Q-11 -15 0 -15 Q11 -15 10.4 -2.6Z', 'sh f-mustard') + p('M-13 -2.6 L13 -2.6', 'ln thick') + p('M0 -15 L0 -8 M-6 -13.4 L-5 -7 M6 -13.4 L5 -7', 'ln thin');
      break;
    case 'beret':
      front = p('M-10.5 -4 Q-12 -13 0 -13.5 Q12 -13 10.5 -4 Q0 -6.6 -10.5 -4Z', 'sh f-accent') + p('M0 -13.5 L1 -16.5', 'ln');
      break;
    case 'short':
    default:
      front = p('M-9 -2 Q-10 -11.4 0 -11.4 Q10 -11.4 9 -2 Q6 -7.4 1 -6.4 Q-5 -8 -9 -2Z', hc);
  }
  let extra = '';
  if (facial === 'mustache') extra += p('M-5 3.2 Q-2.4 1.4 0 2.8 Q2.4 1.4 5 3.2 Q2.6 4.6 0 3.8 Q-2.6 4.6 -5 3.2Z', gray ? 'hair gray' : 'hair');
  if (facial === 'beard') extra += p('M-9 0.5 Q-9.4 12.6 0 12.6 Q9.4 12.6 9 0.5 Q7 6.4 0 7 Q-7 6.4 -9 0.5Z', gray ? 'hair gray' : 'hair');
  if (glasses) extra += circ(-3.4, 0, 3, 'ln thin') + circ(3.4, 0, 3, 'ln thin') + p('M-0.4 0 L0.4 0', 'ln thin');
  if (shades) extra += p('M-7 -1.6 L7 -1.6 L6 2.4 Q4 3.4 1 2 L0 0 L-1 2 Q-4 3.4 -6 2.4Z', 'ink');
  if (headphones) extra += p('M-10.5 0 Q-11.5 -15 0 -15 Q11.5 -15 10.5 0', 'ln thick') + rect(-13, -3, 5, 8, 2, 'sh f-accent') + rect(8, -3, 5, 8, 2, 'sh f-accent');
  return back + skull + face(mood) + front + extra;
}

// ───────────────────────── آدم‌ها ─────────────────────────
const ARMS = {
  down: p('M-10 -41 Q-16 -31 -14 -23') + p('M10 -41 Q16 -31 14 -23'),
  hold: p('M-10 -41 Q-16 -31 -14 -23') + p('M10 -41 Q19 -36 18 -28'),
  both: p('M-10 -41 Q-14 -32 -6 -30') + p('M10 -41 Q14 -32 6 -30'),
  bow: p('M-10 -41 Q-4 -34 2 -36') + p('M10 -41 Q22 -40 27 -44'),
  cheer: p('M-10 -41 Q-17 -48 -18 -58') + p('M10 -41 Q16 -32 18 -27'),
  none: '',
};

/** یک آدم ایستاده. tied: طناب دورش بسته است */
export function human(o = {}) {
  const { outfit = 'teal', tied = true, arms = 'down', hold = '', back = '', lean = 0 } = o;
  let s = back;
  s += p('M-5 -21 L-6 -1 M5 -21 L6 -1') + p('M-6 -1 L-10.5 -0.4 M6 -1 L10.5 -0.4');
  s += ARMS[arms] ?? ARMS.down;
  s += p('M-10 -44 Q-14 -30 -11 -20 L11 -20 Q14 -30 10 -44 Q0 -48.5 -10 -44Z', `sh f-${outfit}`);
  if (o.scarfTeam) s += p('M-9.5 -45 Q0 -40.5 9.5 -45 L9.5 -41 Q0 -36.5 -9.5 -41Z', `sh f-${o.scarfTeam}`) + rect(3, -41, 4.5, 13, 1, `sh f-${o.scarfTeam}`) + p('M3 -35 L7.5 -35 M3 -32 L7.5 -32', 'ln thin');
  if (o.tie) s += p('M0 -45 L-2 -38 L0 -30 L2 -38Z', `sh f-${o.tie === true ? 'gold' : o.tie}`);
  if (o.chain) s += p('M-6 -45 Q0 -36 6 -45', 'ln chain');
  if (tied) s += p('M-15 -36 Q0 -32.6 15 -36 M-15 -28.5 Q0 -25 15 -28.5', 'rope');
  s += g(headShape(o), `translate(0 -56.5) rotate(${lean})`);
  s += hold;
  return s;
}

const CROWD = [
  { hair: 'short', outfit: 'teal', facial: 'mustache' },
  { hair: 'long', outfit: 'mustard' },
  { hair: 'curly', outfit: 'lilac', glasses: true },
  { hair: 'ponytail', outfit: 'sage' },
  { hair: 'bald', outfit: 'blue', facial: 'beard' },
  { hair: 'bob', outfit: 'rose', glasses: true },
  { hair: 'bun', outfit: 'teal' },
  { hair: 'spiky', outfit: 'mustard' },
  { hair: 'short', outfit: 'lilac', facial: 'beard', glasses: true },
  { hair: 'long', outfit: 'sage', glasses: true },
];
export const crowdLook = (i) => CROWD[((i % CROWD.length) + CROWD.length) % CROWD.length];

export const SWITCHMAN = { hair: 'cap', facial: 'mustache', outfit: 'navy' };

/**
 * آدمِ دراز کشیده و بسته‌شده روی ریل (مثل نسخه‌ی اصلی): بدن عمود بر ریل،
 * سر بالای ریل و پاها پایین آن. مرکز بدن روی محور ریل (0,0) است.
 * side: چیزهایی که کنار/پشت بدن کشیده می‌شوند — prop: چیزهایی که روی سینه‌اند
 */
export function lying(o = {}) {
  const { outfit = 'teal', side = '', prop = '', tilt = -12, rope = true } = o;
  let s = side;
  s += ell(-5, 24, 3.8, 5.6, 'sh f-paper2') + ell(5, 24, 3.8, 5.6, 'sh f-paper2');
  s += p('M-10.5 -19 Q-12 -25 -5 -25.5 L5 -25.5 Q12 -25 10.5 -19 L9.5 19 Q0 23 -9.5 19Z', `sh f-${outfit}`);
  s += p('M0 7 L0 19.5', 'ln thin');
  if (o.scarfTeam) s += p('M-10.6 -24 Q0 -20 10.6 -24 L10.6 -19.5 Q0 -15.5 -10.6 -19.5Z', `sh f-${o.scarfTeam}`) + rect(4, -20, 5, 12, 1, `sh f-${o.scarfTeam}`);
  if (o.vest) s += p('M-10.4 -22 Q-11 -25 -6 -25.4 L-3 -25.4 L-4 18 Q-8 20 -9.6 18.6Z M10.4 -22 Q11 -25 6 -25.4 L3 -25.4 L4 18 Q8 20 9.6 18.6Z', `sh f-${o.vest}`) + p('M-10 -6 L-3.6 -6 M3.6 -6 L10 -6 M-9.8 4 L-3.8 4 M3.8 4 L9.8 4', 'ln stripe');
  if (o.tie) s += p('M0 -25 L-2.4 -17 L0 -9 L2.4 -17Z', `sh f-${o.tie === true ? 'gold' : o.tie}`);
  if (o.cardigan) s += p('M-3 -25.4 L0 -14 L3 -25.4', 'ln thin') + p('M0 -14 L0 19', 'ln thin') + circ(-2.4, -6, 1.2, 'ink') + circ(-2.4, 2, 1.2, 'ink') + circ(-2.4, 10, 1.2, 'ink');
  if (o.chain) s += p('M-6.5 -25 Q0 -15 6.5 -25', 'ln chain');
  if (o.blanket) s += p('M-12 -12 Q0 -15 12 -12 L11 21 Q0 25 -11 21Z', `sh f-${o.blanket}`) + p('M-8 -4 L8 -4 M-8 6 L8 6', 'ln thin');
  if (rope) s += p('M-12 -14 Q0 -10.4 12 -14 M-11.6 -6 Q0 -2.4 11.6 -6 M-11 2 Q0 5.6 11 2 M-10.6 10 Q0 13.6 10.6 10', 'rope');
  s += g(headShape(o), 'translate(0 -34)');
  s += prop;
  return g(s, `rotate(${tilt})`);
}

const tiltFor = (i) => -14 + ((i * 7) % 3) * 4;
const phoneSvg = (x, y) => rect(x - 4, y - 13, 8, 14, 1.6, 'sh f-ink') + rect(x - 2.6, y - 11.4, 5.2, 9.6, 0.8, 'scr');
const LY = { w: 24, h: 50 }; // ابعاد یک آدم دراز کشیده

// ───────────────────────── آیتم‌ها ─────────────────────────
// هر سازنده: (opts, index, seed) => { svg, w, h, humans, sfx, burst }
export const ITEMS = {
  person: (o, i, seed) => {
    const svg = lying({ ...crowdLook(i + seed), mood: o.mood || 'scared', tilt: tiltFor(i) });
    // آدم‌های «صد سال بعد» کم‌رنگ‌اند و کمی سوسو می‌زنند
    return { svg: o.future ? g(svg, '', 'future') : svg, ...LY, humans: 1, kind: 'human' };
  },

  you: (o, i) => ({
    svg: lying({ ...SWITCHMAN, mood: 'worried', tilt: tiltFor(i), prop: o.phone ? phoneSvg(0, -2) : '' }),
    ...LY, h: 54, humans: 1, kind: 'human',
  }),

  fan: (o, i) => {
    const team = o.team === 'blue' ? 'blue' : 'red';
    const look = crowdLook(i * 3 + (team === 'blue' ? 1 : 0));
    const flag = i === 0
      ? p('M17 24 L17 -58', 'ln') + p('M17 -58 Q27 -62 37 -56 Q29 -51 37 -44 Q27 -50 17 -45Z', `sh f-${team} flag`)
      : '';
    return {
      svg: lying({ ...look, outfit: team, scarfTeam: 'paper2', mood: i % 2 ? 'scared' : 'worried', tilt: tiltFor(i), side: flag }),
      w: 26, h: i === 0 ? 66 : LY.h, humans: 1, kind: 'human',
    };
  },

  elder: (o, i) => {
    const grandma = i % 2 === 1;
    const look = grandma
      ? { hair: i % 4 === 1 ? 'bun' : 'bob', gray: true, glasses: true, outfit: 'mustard' }
      : { hair: i % 4 === 2 ? 'bald' : 'short', gray: true, facial: i % 4 === 2 ? 'beard' : 'mustache', glasses: i % 4 === 0, outfit: 'sage' };
    const cane = p('M14 -14 L17 24', 'ln thick') + p('M14 -14 Q13 -19 9 -18', 'ln thick');
    return { svg: lying({ ...look, mood: 'worried', tilt: tiltFor(i), side: cane }), w: 28, h: LY.h, humans: 1, kind: 'human' };
  },

  baby: () => ({
    svg:
      p('M-19 -18 L19 -18 L14 0 L-14 0Z', 'sh f-mustard') +
      p('M-16 -10 L16 -10 M-17.5 -14 L17.5 -14 M-8 -18 L-7 0 M0 -18 L0 0 M8 -18 L7 0', 'ln thin') +
      g(circ(0, 0, 8, 'sh skin') + p('M-3 -1 L-3 -0.8 M3 -1 L3 -0.8', 'ln eye') + circ(0, 3.4, 1.8, 'sh f-accent') + p('M-2 -8 Q0 -11 1 -8', 'ln thin'), 'translate(-5 -26)') +
      p('M-18 -18 Q-8 -28 2 -20 Q10 -27 18 -18Z', 'sh f-rose') +
      p('M-16 -8 Q0 -4 16 -8', 'rope'),
    w: 40, h: 40, humans: 1, kind: 'human',
  }),

  robot: (o, i) => ({
    svg: g(
      rect(-8, 14, 6, 12, 1.5) + rect(2, 14, 6, 12, 1.5) +
      rect(-12, -22, 24, 37, 4, 'sh f-gray') +
      p('M0 -2.5 C-6 -7 -5.5 -12.5 -2.6 -12.5 C-1 -12.5 0 -11 0 -10 C0 -11 1 -12.5 2.6 -12.5 C5.5 -12.5 6 -7 0 -2.5Z', 'sh f-accent heart') +
      p('M-13 -16 Q0 -12.4 13 -16 M-13 5 Q0 8.6 13 5', 'rope') +
      p('M0 -42 L0 -49') + circ(0, -51, 2.6, 'sh f-mustard blink') +
      rect(-10.5, -42, 21, 18, 4, 'sh f-paper2') +
      circ(-4.2, -34.6, 2, 'ink') + circ(4.2, -34.6, 2, 'ink') +
      p('M-4 -29 Q-2 -31 0 -29 Q2 -27 4 -29') +
      (i % 2 ? p('M6.2 -32.4 Q7.6 -29.6 6.2 -28.4 Q4.8 -29.6 6.2 -32.4Z', 'sh f-sky tear') : ''), `rotate(${tiltFor(i)})`),
    w: 26, h: 54, humans: 0, kind: 'metal', sfx: 'clank',
  }),

  mystery: () => ({
    svg:
      rect(-18, -34, 36, 34, 2.5, 'sh f-mustard') +
      g(rect(-20.5, -41, 41, 9, 2.5, 'sh f-mustard') + p('M-6 -41 Q-10 -50 -3 -48 Q0 -46 0 -41 Q0 -46 3 -48 Q10 -50 6 -41', 'sh f-accent'), '', 'lid') +
      p('M0 -32 L0 0', 'ln thin') + txt(-9, -10, '؟', 18, 'tx big') + txt(9.5, -12, '؟', 13, 'tx big'),
    w: 44, h: 52, humans: 0, kind: 'box', sfx: 'thud', random: 'mystery',
  }),

  rider: () => ({
    svg:
      g(
        circ(-22, -10, 10) + circ(22, -10, 10) + circ(-22, -10, 2.2, 'ink') + circ(22, -10, 2.2, 'ink') +
        p('M-22 -10 L-12 -24 M22 -10 L14 -22') +
        p('M-15 -26 Q-2 -33 12 -27 L16 -21 L-12 -19Z', 'sh f-red') +
        p('M-14 -26 L-18 -37 L-13 -39') + circ(-21, -23, 2.4, 'sh f-gold') + p('M2 -28 L14 -28', 'ln thick') +
        p('M26 -16 q7 -2 9 -7', 'ln thin exhaust') + circ(38, -27, 3, 'ln thin exhaust') + circ(43, -33, 4, 'ln thin exhaust e2'),
        'translate(40 4) scale(1.1)') +
      g(lying({ hair: 'short', facial: 'mustache', outfit: 'sage', mood: 'smug', tilt: -10 }), 'translate(-14 0)'),
    w: 84, h: 52, humans: 1, kind: 'human', sfx: 'honk',
  }),

  pedestrian: () => ({
    svg:
      [-22, -12, -2, 8].map((x) => rect(x, -9, 7, 18, 0.5, 'sh f-paper zebra')).join('') +
      p('M26 24 L26 -40', 'ln') + rect(21, -64, 10, 26, 3, 'sh f-ink') +
      circ(26, -58, 3, 'sh f-paper2') + circ(26, -51, 3, 'sh f-paper2') + circ(26, -44, 3, 'sh f-green lit') +
      g(lying({ ...crowdLook(5), mood: 'scared', tilt: -10, side: rect(9, 4, 10, 8, 1.5, 'sh f-ink') + p('M12 4 Q14 1 16 4', 'ln thin') }), 'translate(-6 0)'),
    w: 58, h: 66, humans: 1, kind: 'human',
  }),

  rich: () => ({
    svg: lying({
      hair: 'short', outfit: 'ink', tie: true, chain: true, shades: true, mood: 'smug',
      prop: g(rect(0, 0, 16, 10, 1.5, 'sh f-money') + rect(5.6, 0, 4.8, 10, 0, 'sh f-paper2') + rect(0, -3, 16, 3, 1, 'sh f-money'), 'translate(-8 -6) rotate(-6)') +
        g(txt(0, 0, '$', 9, 'tx money-float'), 'translate(-18 -50)') + g(txt(0, 0, '$', 7, 'tx money-float m2'), 'translate(18 -56)'),
    }),
    w: 30, h: 60, humans: 1, kind: 'human', sfx: 'coins', burst: 'coins',
  }),

  tahdig: () => ({
    svg: g(
      ell(0, -3, 28, 5.4, 'sh f-paper2') + ell(0, -4.6, 21, 3, 'ln thin') +
      p('M-21 -6 Q-22.4 -18 0 -19.4 Q22.4 -18 21 -6 Q0 -2 -21 -6Z', 'sh f-gold') +
      p('M-14 -14 L-9 -9 L-3 -15 M4 -10 L9 -15 L14 -11 M-4 -7 L1 -11', 'ln thin') +
      p('M-8 -22 L-8 -21.4 M3 -22 L3 -21.4 M-2 -24 L-2 -23.4 M10 -20 L10 -19.4', 'ln eye') +
      g(p('M0 -6 L0 6 M-6 0 L6 0 M-3.5 -3.5 L3.5 3.5 M-3.5 3.5 L3.5 -3.5', 'ln thin'), 'translate(22 -30)', 'twinkle') +
      g(p('M0 -4 L0 4 M-4 0 L4 0', 'ln thin'), 'translate(-24 -26)', 'twinkle t2'), 'scale(1.2)'),
    w: 66, h: 44, humans: 0, kind: 'food', sfx: 'crunch', burst: 'rice',
  }),

  divan: () => ({
    svg:
      g(p('M-24 -10 L24 -10 L28 -2 L-28 -2Z', 'sh f-wood'), '') +
      p('M-16 0 L10 -22 M16 0 L-10 -22', 'ln wood-leg') +
      p('M-26 -36 Q-13 -43 0 -36 L0 -16 Q-13 -23 -26 -16Z', 'sh f-paper') +
      p('M26 -36 Q13 -43 0 -36 L0 -16 Q13 -23 26 -16Z', 'sh f-paper') +
      p('M-22 -33 Q-13 -38 -4 -33 L-4 -30 Q-13 -35 -22 -30Z', 'sh f-gold') +
      p('M4 -33 Q13 -38 22 -33 L22 -30 Q13 -35 4 -30Z', 'sh f-gold') +
      p('M-21 -26 q2 -2 4 0 t4 0 t4 0 t4 0 M-21 -21 q2 -2 4 0 t4 0 t4 0 M5 -26 q2 -2 4 0 t4 0 t4 0 t4 0 M5 -21 q2 -2 4 0 t4 0 t4 0', 'ln hair-line') +
      g(p('M0 -50 L0 -58 M-12 -46 L-17 -52 M12 -46 L17 -52 M-20 -38 L-27 -40 M20 -38 L27 -40', 'ln thin rays'), '', 'glow'),
    w: 60, h: 60, humans: 0, kind: 'paper', sfx: 'paper', burst: 'paper',
  }),

  cousin: () => ({
    svg: lying({
      hair: 'spiky', outfit: 'rose', mood: 'smug', facial: 'mustache', tilt: -10,
      side: g(rect(0, 0, 15, 18, 1.5, 'sh f-paper') + txt(7.5, 8, 'رسید', 5, 'tx') + p('M3 12 L12 12 M3 15 L10 15', 'ln thin'), 'translate(12 -8) rotate(14)'),
    }),
    w: 32, h: LY.h, humans: 1, kind: 'human',
  }),

  cat: () => ({
    svg: g(
      p('M12 -5 Q28 -6 26 -21 Q24 -28 19 -23', 'ln thick tail') +
      ell(0, -13, 15.5, 13.5, 'sh f-gray') +
      ell(-7, -1.5, 5, 3, 'sh f-gray') + ell(7, -1.5, 5, 3, 'sh f-gray') +
      p('M-15 -16 Q0 -11 15 -16', 'rope') +
      p('M-10 -38 L-9.4 -47 L-3 -41.6Z', 'sh f-gray') + p('M10 -38 L9.4 -47 L3 -41.6Z', 'sh f-gray') +
      ell(0, -33, 12.5, 10.5, 'sh f-gray') +
      p('M-6.6 -34 q2 -2.4 4 0 M2.6 -34 q2 -2.4 4 0') +
      p('M-1.4 -30.6 L1.4 -30.6 L0 -29Z', 'sh f-rose') + p('M0 -29 Q-1.6 -26.6 -3 -27.6 M0 -29 Q1.6 -26.6 3 -27.6', 'ln thin') +
      p('M-5 -30 L-15 -32 M-5 -29 L-15 -27 M5 -30 L15 -32 M5 -29 L15 -27', 'ln thin') +
      p('M-9 -24 Q0 -20.6 9 -24', 'rope collar') + circ(0, -21.6, 2.4, 'sh f-gold'), 'scale(1.1)'),
    w: 46, h: 56, humans: 0, kind: 'animal', sfx: 'meow',
  }),

  breadGuy: (o, i, seed) => ({
    svg: lying({
      ...crowdLook(i + seed + 2), mood: 'worried', tilt: tiltFor(i),
      prop: g(p('M0 -16 Q6 -13 5 -5 Q8 3 4 11 Q6 19 1 23 Q-4 21 -3 13 Q-6 5 -2 -3 Q-5 -11 0 -16Z', 'sh f-bread') + p('M0 -8 L0 -7.4 M2 2 L2 2.6 M0 12 L0 12.6', 'ln eye'), 'rotate(8)'),
    }),
    ...LY, humans: 1, kind: 'human',
  }),

  hoarder: () => {
    let stack = '';
    for (let k = 0; k < 9; k++) {
      const y = 20 - k * 6.2;
      const sx = k % 2 ? 2 : -2;
      stack += p(`M${-15 + sx} ${y} Q${-8 + sx} ${y - 5} ${0 + sx} ${y - 2} Q${8 + sx} ${y - 6} ${15 + sx} ${y} Q${8 + sx} ${y + 3} ${0 + sx} ${y + 1} Q${-8 + sx} ${y + 4} ${-15 + sx} ${y}Z`, 'sh f-bread');
    }
    return {
      svg: g(stack, 'translate(24 0)') + lying({ hair: 'bald', facial: 'mustache', outfit: 'mustard', mood: 'smug', tilt: -10 }),
      w: 56, h: 52, humans: 1, kind: 'human',
    };
  },

  sleeper: (o, i, seed) => ({
    svg:
      lying({
        ...crowdLook(i + seed), mood: 'sleep', tilt: tiltFor(i), blanket: i % 2 ? 'blue' : 'lilac',
        side: ell(0, -38, 13, 7, 'sh f-paper2'),
      }) +
      g(txt(0, 0, 'z', 9, 'tx zz') + txt(7, -9, 'z', 12, 'tx zz z2') + txt(15, -20, 'Z', 15, 'tx zz z3'), 'translate(4 -50)'),
    w: 28, h: 74, humans: 1, kind: 'human',
  }),

  awake: () => ({
    svg: lying({
      hair: 'spiky', outfit: 'teal', mood: 'wide', tilt: -10,
      side: rect(13, -2, 9, 11, 2, 'sh f-paper') + p('M22 1 q4 0 3 4 q-1 2 -3 1', 'ln thin') + p('M15 -6 q-2 -3 0 -6 M19 -6 q2 -3 0 -6', 'ln thin steam'),
    }),
    w: 34, h: LY.h, humans: 1, kind: 'human',
  }),

  calendar: () => ({
    svg: g(
      rect(-21, -52, 42, 52, 3) + rect(-21, -52, 42, 15, 3, 'sh f-accent') +
      circ(-10, -53, 2.6) + circ(10, -53, 2.6) +
      txt(0, -41, 'پنجشنبه', 7.4, 'tx on-accent') +
      txt(0, -15, '۲۴', 21, 'tx big') + txt(0, -5, 'تعطیل', 6.4, 'tx red'), 'scale(1.1)'),
    w: 48, h: 62, humans: 0, kind: 'paper', sfx: 'paper', burst: 'paper',
  }),

  dynamite: () => ({
    svg:
      rect(-30, -38, 8, 38, 1.5, 'sh f-paper2') + rect(22, -38, 8, 38, 1.5, 'sh f-paper2') +
      rect(-32, -40, 64, 10, 2, 'sh f-red') + p('M-24 -40 L-18 -30 M-10 -40 L-4 -30 M4 -40 L10 -30 M18 -40 L24 -30', 'ln stripe') +
      rect(-15, -24, 8, 24, 2, 'sh f-red') + rect(-4, -26, 8, 26, 2, 'sh f-red') + rect(7, -23, 8, 23, 2, 'sh f-red') +
      p('M-14 -14 L14 -14', 'rope') +
      p('M0 -26 Q4 -36 -2 -42 Q-6 -48 2 -52', 'ln thin') +
      g(p('M0 -5 L0 5 M-5 0 L5 0 M-3.4 -3.4 L3.4 3.4 M-3.4 3.4 L3.4 -3.4', 'ln spark'), 'translate(2 -54)', 'sparkle') +
      g(p('M0 -12 L11 7 L-11 7Z', 'sh f-mustard') + txt(0, 5, '!', 10, 'tx'), 'translate(-38 -64)'),
    w: 72, h: 70, humans: 0, kind: 'boom', sfx: 'boom', burst: 'boom', stops: true,
  }),

  fog: () => ({
    svg: '', w: 220, h: 60, humans: 0, kind: 'fog', random: 'fog',
  }),

  phone: () => ({
    svg:
      p('M-12 0 L-6 -10 L6 -10 L12 0Z', 'sh f-paper2') +
      rect(-15, -60, 30, 52, 5, 'sh f-ink') + rect(-12, -55, 24, 41, 2, 'scr') +
      g(p('M0 -14 L10 -10 L10 -2 Q10 7 0 12 Q-10 7 -10 -2 L-10 -10Z', 'sh f-green') + p('M-4 0 L-1 3 L5 -4', 'ln thick'), 'translate(0 -40) scale(0.62)') +
      txt(0, -21, 'وصل شد', 6, 'tx') +
      g(p('M-8 -4 Q0 -11 8 -4 M-13 -9 Q0 -20 13 -9 M-3.4 0 Q0 -3 3.4 0', 'ln thin wifi'), 'translate(0 -70)'),
    w: 36, h: 84, humans: 0, kind: 'glass', sfx: 'glass', burst: 'paper',
  }),

  // گوشی با گالری ده سال عکس، و ابر بکاپ خط‌خورده بالایش
  gallery: () => {
    const fills = ['sky', 'rose', 'mustard', 'sage', 'lilac', 'gold'];
    let grid = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        const x = -12.6 + c * 8.8;
        const y = -52 + r * 8.8;
        grid += rect(x, y, 7.6, 7.6, 1, `sh thin f-${fills[(i * 5) % fills.length]}`);
        if (i % 3 === 0) grid += p(`M${x + 1} ${y + 6.6} L${x + 3.4} ${y + 3.4} L${x + 5} ${y + 5.2} L${x + 6.6} ${y + 3.8}`, 'ln thin');
        else if (i % 3 === 1) grid += circ(x + 3.8, y + 3.4, 1.4, 'sh thin skin');
      }
    }
    return {
      svg: g(
        p('M-13 0 L-7 -10 L7 -10 L13 0Z', 'sh f-paper2') +
        rect(-17, -66, 34, 58, 5, 'sh f-ink') + rect(-14, -61, 28, 47, 2, 'scr') +
        txt(0, -54.6, 'گالری', 5.5, 'tx') + grid +
        g(p('M-9 4 Q-14 4 -14 -1 Q-14 -6 -9 -5.6 Q-8 -11 -1 -11 Q6 -11 7 -5 Q13 -5 13 0 Q13 4 8 4Z', 'sh f-paper') +
          p('M-11 -9 L11 6', 'ln thick ban'), 'translate(0 -82)') +
        g(p('M0 3 C-6 -1 -5 -5 -2.6 -5 C-1.2 -5 -0.4 -4 0 -3.2 C0.4 -4 1.2 -5 2.6 -5 C5 -5 6 -1 0 3Z', 'sh f-accent'), 'translate(21 -62)', 'heart'), 'scale(1.3)'),
      w: 56, h: 124, humans: 0, kind: 'glass', sfx: 'glass', burst: 'photos',
    };
  },

  // خانه‌ی خالی: پنجره با پرده، گلدان لب پنجره، در و پلاک
  house: () => ({
    svg: g(
      rect(15, -70, 8, 18, 1, 'sh f-tea') +
      rect(-27, -44, 54, 44, 1.5, 'sh f-mustard') +
      p('M-33 -42 L0 -70 L33 -42Z', 'sh f-tea') +
      p('M-24 -48 L0 -64 M24 -48 L8 -58', 'ln thin') +
      rect(-21, -36, 19, 17, 1.5, 'sh f-sky') + p('M-11.5 -36 L-11.5 -19 M-21 -27.5 L-2 -27.5', 'ln thin') +
      p('M-21 -36 L-15 -36 Q-16.4 -28 -21 -22Z', 'sh thin f-rose') + p('M-2 -36 L-8 -36 Q-6.6 -28 -2 -22Z', 'sh thin f-rose') +
      rect(-23, -19.5, 23, 3, 1, 'sh thin f-wood') +
      g(p('M-14.5 -19.5 L-15.5 -25 L-7.5 -25 L-8.5 -19.5Z', 'sh thin f-tea') +
        p('M-11.5 -25 Q-16 -30 -14 -34 Q-10.6 -31 -11.5 -25 M-11.5 -25 Q-7 -31 -4.4 -31 Q-5.4 -27 -11.5 -25', 'sh thin f-sage'), '', 'flag') +
      rect(5, -28, 13, 28, 1.5, 'sh f-wood') + circ(15, -14, 1.2, 'ink') +
      rect(7.5, -24, 8, 4.6, 1, 'sh thin f-paper') +
      rect(3, -2, 17, 2.4, 1, 'sh thin f-red'), 'scale(1.3)'),
    w: 90, h: 96, humans: 0, kind: 'wall', sfx: 'thud', burst: 'bricks',
  }),

  // ته‌دیگ با تابلوی ممنوع کنارش
  notahdig: (o, i, seed) => {
    const t = ITEMS.tahdig(o, i, seed);
    return {
      ...t,
      svg: g(t.svg, 'translate(-12 0)') +
        p('M36 0 L36 -36', 'ln thick') +
        circ(36, -52, 17, 'sh f-paper') + circ(36, -52, 14, 'ln ban') + p('M26 -62 L46 -42', 'ln ban') +
        txt(36, -74, 'ممنوع', 9, 'tx red'),
      w: 100, h: 84,
    };
  },

  // ───────── مرحله‌های نسخه‌ی ۲ ─────────

  // مرد کوله‌به‌دوش روی پل عابر (ایستاده؛ بعد از هل دادن در صحنه روی ریل می‌افتد)
  backpacker: () => ({
    svg: human({
      hair: 'short', facial: 'beard', outfit: 'blue', mood: 'neutral', tied: false,
      back:
        rect(-22, -76, 44, 62, 9, 'sh f-sage') + p('M-22 -54 Q0 -48 22 -54', 'ln thin') +
        ell(0, -79, 19, 6.4, 'sh f-mustard') + p('M-10 -84.6 L-10 -73.4 M10 -84.6 L10 -73.4', 'ln thin') +
        rect(-28, -44, 8, 20, 3, 'sh f-sage') + rect(20, -44, 8, 20, 3, 'sh f-sage') + p('M-28 -36 L-20 -36 M20 -36 L28 -36', 'ln thin') +
        txt(0, -60, '۴۰ کیلو', 7),
    }) + p('M-7 -45 Q-8.6 -34 -6.4 -24 M7 -45 Q8.6 -34 6.4 -24', 'ln thick'),
    w: 58, h: 88, humans: 1, kind: 'human',
  }),

  // ماهی‌های قرمز در تنگ
  goldfish: () => {
    const fish = [[-10, -18, 1], [8, -24, -1], [-4, -32, -1], [10, -12, 1], [-13, -28, 1]]
      .map(([x, y, d], k) => g(
        p('M-6 0 Q-1 -4.4 4 0 Q-1 4.4 -6 0Z', 'sh f-accent') + p('M4 0 L8.4 -3.4 L8.4 3.4Z', 'sh f-accent') + circ(-3.4, -0.6, 0.7, 'ink'),
        `translate(${x} ${y}) scale(${d} 1)`, `fish${k % 2 ? ' f2' : ''}`))
      .join('');
    return {
      svg: g(
        ell(0, -1.6, 15, 3, 'sh f-paper2') +
        p('M-12 -46 Q-26 -36 -24 -20 Q-21 -2 0 -2 Q21 -2 24 -20 Q26 -36 12 -46Z', 'sh f-glass') +
        p('M-22.6 -34 Q0 -30 22.6 -34', 'ln thin') + fish +
        ell(0, -46, 12, 3, 'sh f-glass') + p('M-17 -24 Q-17 -12 -10 -7', 'ln thin shine') +
        p('M-23 -21 Q0 -15 23 -21', 'rope'), 'scale(1.4)'),
      w: 72, h: 72, humans: 0, kind: 'glass', sfx: 'splash', burst: 'water', words: ['شلپ!'],
    };
  },

  dog: () => ({
    svg: g(
      p('M12 -6 Q27 -8 25 -23', 'ln thick wag') +
      ell(0, -14, 15, 13.5, 'sh f-bread') +
      rect(-10, -9, 6.5, 9.5, 2.5, 'sh f-bread') + rect(3.5, -9, 6.5, 9.5, 2.5, 'sh f-bread') +
      p('M-15 -17 Q0 -12 15 -17', 'rope') +
      ell(0, -36, 11.5, 10.5, 'sh f-bread') +
      p('M-8.6 -43.4 Q-18 -44 -16.4 -29 Q-12.4 -27.6 -9.6 -35Z', 'sh f-wood') +
      p('M8.6 -43.4 Q18 -44 16.4 -29 Q12.4 -27.6 9.6 -35Z', 'sh f-wood') +
      p('M-5 -38.6 L-5 -38.4 M5 -38.6 L5 -38.4', 'ln eye') + p('M-7.6 -42.6 L-3.4 -41.6 M7.6 -42.6 L3.4 -41.6', 'ln thin') +
      ell(0, -30, 6.6, 4.6, 'sh f-paper2') + ell(0, -32.6, 2.4, 1.7, 'ink') +
      p('M0 -31 L0 -28.8 M-3 -28.4 Q0 -26.2 3 -28.4', 'ln thin') + p('M-1.6 -27.8 Q0 -23 1.6 -27.8Z', 'sh f-rose') +
      p('M-8.6 -25.6 Q0 -21.6 8.6 -25.6', 'ln collar') + circ(0, -22.4, 2.6, 'sh f-gold'), 'scale(1.3)'),
    w: 54, h: 64, humans: 0, kind: 'animal', sfx: 'woof', words: ['واق؟!', 'تپ!'],
  }),

  // آدم‌های سلفی‌گیر؛ اولی تابلوی «ورود ممنوع» را کنارش دارد
  selfie: (o, i, seed) => {
    const look = crowdLook(i * 2 + seed + 1);
    const arm = p('M-9 -21 Q-16 -30 -19 -42', 'ln') + g(rect(-4, -14, 8, 14, 1.6, 'sh f-ink') + rect(-2.6, -12.4, 5.2, 9.6, 0.8, 'scr'), 'translate(-19 -42) rotate(-20)');
    const sign = i === 0
      ? p('M24 26 L24 -46', 'ln') + circ(24, -55, 10, 'sh f-red') + rect(17.5, -57, 13, 4, 1, 'sh f-paper') +
        rect(9, -42, 30, 10, 2, 'sh f-paper') + txt(24, -34.6, 'ورود ممنوع', 5.4)
      : '';
    return {
      svg: sign + lying({ ...look, mood: i % 2 ? 'happy' : 'smug', tilt: tiltFor(i), side: arm }),
      w: i === 0 ? 46 : 30, h: i === 0 ? 68 : 56, humans: 1, kind: 'human',
    };
  },

  // کارگر راه‌آهن با کلاه ایمنی و جلیقه‌ی شب‌نما
  worker: () => ({
    svg: lying({
      hair: 'helmet', facial: 'mustache', outfit: 'blue', vest: 'mustard', mood: 'worried', tilt: -10,
      side: g(p('M0 0 L0 22', 'ln thick') + p('M-6 -2 Q0 -8 6 -2 L4 1 Q0 -2 -4 1Z', 'sh f-gray'), 'translate(17 -4) rotate(18)'),
    }),
    w: 34, h: 58, humans: 1, kind: 'human',
  }),

  // پراید (سه رنگ)
  pride: (o, i) => {
    const color = ['paper2', 'gray', 'sky'][i % 3];
    return {
      svg:
        p('M-32 -11 L-32 -21 Q-32 -24 -28 -24 L-15 -25 L-7 -37.5 Q-6 -39 -3.5 -39 L23 -39 Q25.5 -39 26.4 -36.8 L31 -25 Q32 -24 32 -21 L32 -11 Q32 -8 29 -8 L-29 -8 Q-32 -8 -32 -11Z', `sh f-${color}`) +
        p('M-5 -36 L4 -36 L4 -27 L-11 -27Z', 'sh f-glass') + p('M7 -36 L22.4 -36 L26.4 -27 L7 -27Z', 'sh f-glass') +
        p('M5.5 -27 L5.5 -10 M-12 -24 L-12 -10', 'ln thin') + p('M9 -21 L13 -21 M-8 -21 L-4 -21', 'ln thin') +
        rect(-33, -15, 6, 4, 1.2, 'sh f-gold') + p('M27 -14 L33 -14', 'ln thick') + p('M18 -39 L14 -49', 'ln thin') +
        (i === 1 ? p('M-24 -18 q3 -2 5 1', 'ln thin') : '') +
        circ(-19, -7, 7.4) + circ(19, -7, 7.4) + circ(-19, -7, 2.4, 'ink') + circ(19, -7, 2.4, 'ink'),
      w: 66, h: 48, humans: 0, kind: 'metal', sfx: 'clank', burst: 'bolts',
    };
  },

  // ماشین اسپرت بدون هیچ نشان و آرم
  sportscar: () => ({
    svg:
      p('M-44 -12 Q-45 -18 -39 -20 L-22 -23 Q-11 -35 5 -35.5 Q22 -36 34 -24 Q44 -22.6 44 -15 L44 -12 Q44 -8.6 40 -8.6 L-40 -8.6 Q-44 -8.6 -44 -12Z', 'sh f-red') +
      p('M-15 -24 Q-7 -32.4 5 -32.6 Q15 -32.6 22 -24Z', 'sh f-glass') + p('M4 -32.6 L4 -24', 'ln thin') +
      p('M-12 -24 Q4 -21 30 -23 M-6 -21 L-6 -11 M20 -22 L21 -11', 'ln thin') +
      ell(-39, -16.4, 3.4, 2, 'sh f-gold') + p('M36 -24 L45 -27 L45 -21', 'ln') +
      circ(-26, -9, 8.6) + circ(27, -9, 8.6) + circ(-26, -9, 4.6, 'sh f-gray') + circ(27, -9, 4.6, 'sh f-gray') +
      g(p('M0 -6 L0 6 M-6 0 L6 0', 'ln thin'), 'translate(-2 -42)', 'twinkle'),
    w: 92, h: 50, humans: 0, kind: 'metal', sfx: 'clank', burst: 'bolts',
  }),

  // کیسه‌ی پول با برچسب خیریه
  charity: () => ({
    svg: g(
      rect(-30, -10, 18, 10, 1.5, 'sh f-money') + rect(-28, -18, 18, 8, 1.5, 'sh f-money') + rect(-23, -18, 5, 8, 0, 'sh f-paper2') +
      p('M-15 -2 Q-23 -16 -12 -28 L-6 -32 Q-10 -38 -6.4 -43 L6.4 -43 Q10 -38 6 -32 L12 -28 Q23 -16 15 -2 Q0 3 -15 -2Z', 'sh f-bread') +
      p('M-7 -32.6 Q0 -29.6 7 -32.6', 'rope') + p('M6 -32 Q14 -32 16 -26', 'ln thin') +
      g(rect(0, 0, 22, 15, 2.4, 'sh f-paper') + p('M5 7.6 C2 5 3 2.6 5 2.6 C6 2.6 6.6 3.6 6.6 4 C6.6 3.6 7.2 2.6 8.4 2.6 C10.4 2.6 11.2 5 8 7.6Z', 'sh f-accent') + txt(15.4, 7.4, 'خیریه', 5), 'translate(12 -27) rotate(10)') +
      g(circ(0, 0, 5, 'sh f-gold'), 'translate(-2 -50)', 'coin-float'), 'scale(1.25)'),
    w: 66, h: 72, humans: 0, kind: 'paper', sfx: 'coins', burst: 'coins',
  }),

  // یوزپلنگ ایرانی: نشسته، باریک و خال‌خالی، با خط اشک سیاه زیر چشم‌ها
  cheetah: () => {
    const spots = [[2, -30], [7, -24], [-2, -22], [10, -16], [4, -14], [-4, -12], [14, -8], [7, -6], [-1, -32], [12, -28], [-7, -20], [17, -14]]
      .map(([x, y]) => circ(x, y, 1.2, 'ink')).join('');
    return {
      svg: g(
        p('M15 -3 Q33 -2 32 -18 Q31 -27 25 -29', 'ln thick tail') + p('M30.4 -21 L33.4 -20 M28.6 -25.4 L31.2 -26.6 M26 -28 L27.6 -30', 'ln thin') +
        p('M-10 -36 Q-14 -20 -12 -2 L17 -2 Q22 -15 13 -26 Q6 -37 -1 -41Z', 'sh f-bread') +
        ell(9, -11, 9, 8.6, 'sh f-bread') + ell(11, -1.8, 7, 2.6, 'sh f-bread') + spots +
        p('M-10 -27 L-11 0 L-5 0 L-4.6 -27', 'sh f-bread') + p('M-2.6 -27 L-2.6 0 L3.2 0 L3 -26', 'sh f-bread') +
        circ(-8, -5, 0.9, 'ink') + circ(0, -9, 0.9, 'ink') +
        p('M-13 -24 Q2 -18 17 -22', 'rope') +
        p('M-12.4 -54.4 L-12.8 -58.6 L-9.6 -57 M-0.4 -54.4 L0 -58.6 L-3.2 -57', 'sh f-bread') +
        ell(-6.4, -50, 8.6, 7.4, 'sh f-bread') +
        p('M-9.6 -51.6 L-9.6 -51.4 M-3.2 -51.6 L-3.2 -51.4', 'ln eye') +
        p('M-10.4 -50.4 Q-11.6 -47 -9.2 -44.2 M-2.4 -50.4 Q-1.2 -47 -3.6 -44.2', 'ln') +
        p('M-8 -47.6 L-4.8 -47.6 L-6.4 -45.8Z', 'sh f-rose') + p('M-6.4 -45.8 L-6.4 -44.6 M-8.4 -43.6 Q-6.4 -42.6 -4.4 -43.6', 'ln thin') +
        p('M-11.6 -45.6 L-15.4 -46.4 M-11.6 -44.4 L-15.2 -43.6 M-1.2 -45.6 L2.6 -46.4 M-1.2 -44.4 L2.4 -43.6', 'ln thin') +
        circ(-11, -56, 0.8, 'ink') + circ(-2, -56.2, 0.8, 'ink'), 'scale(1.25)'),
      w: 58, h: 76, humans: 0, kind: 'animal', sfx: 'growl', words: ['غرررر!', 'تپ!'],
    };
  },

  // دیوار آجری ته ریل (قطار به آن می‌خورد و می‌ایستد)
  wall: () => {
    let bricks = '';
    for (let r = 0; r < 8; r++) {
      const y = -8 - r * 8;
      bricks += p(`M-20 ${y} L20 ${y}`, 'ln thin');
      for (let x = r % 2 ? -10 : -15; x < 20; x += 10) bricks += p(`M${x} ${y} L${x} ${y + 8}`, 'ln thin');
    }
    return {
      svg: rect(-20, -64, 40, 64, 1.5, 'sh f-tea') + bricks + p('M-24 0 L-24 -12 M24 0 L24 -12', 'ln thick') + rect(-26, -14, 52, 6, 2, 'sh f-mustard') + p('M-18 -14 L-14 -8 M-6 -14 L-2 -8 M6 -14 L10 -8 M18 -14 L22 -8', 'ln stripe-ink'),
      w: 52, h: 66, humans: 0, kind: 'wall', sfx: 'thud', burst: 'bricks', solid: true, stops: 'wall',
    };
  },

  // دروازه‌ی زمان؛ قطار از آن رد می‌شود و به صد سال بعد می‌رود
  portal: () => ({
    svg:
      ell(0, -1.6, 22, 3.4, 'sh f-paper2') +
      ell(0, -36, 22, 35, 'sh f-lilac') + ell(0, -36, 15, 27, 'sh f-paper2') +
      g(p('M0 -14 Q11 -14 11 -2 Q11 10 -1 10 Q-9 10 -9 1 Q-9 -6 -1 -6 Q4 -6 4 -1', 'ln thin'), 'translate(0 -36)', 'swirl') +
      p('M0 -36 L0 -45 M0 -36 L6 -32', 'ln thick') + circ(0, -36, 1.8, 'ink') +
      g(p('M0 -5 L0 5 M-5 0 L5 0', 'ln thin'), 'translate(-26 -66)', 'twinkle') +
      g(p('M0 -4 L0 4 M-4 0 L4 0', 'ln thin'), 'translate(27 -58)', 'twinkle t2'),
    w: 50, h: 74, humans: 0, kind: 'portal', sfx: 'whoosh', pass: true,
  }),

  // همکاری که ایده‌ی شما را به اسم خودش ارائه داد
  coworker: () => ({
    svg: lying({
      hair: 'short', outfit: 'sky', tie: 'accent', glasses: true, mood: 'scared', tilt: -10,
      prop: p('M-5 -25 L-2 -13 M5 -25 L2 -13', 'ln thin') + rect(-4.4, -13, 8.8, 10, 1.4, 'sh f-paper') + p('M-2 -9 L2 -9 M-2 -6.4 L1 -6.4', 'ln thin'),
      side: g(rect(0, 0, 24, 17, 2, 'sh f-mustard') + p('M0 3 L24 3', 'ln thin') + txt(12, 12, 'ایده‌ی من', 5), 'translate(12 -12) rotate(12)'),
    }),
    w: 40, h: LY.h, humans: 1, kind: 'human',
  }),

  // مادر: میان‌سال، مهربان، با ژاکت دکمه‌دار
  mother: () => ({
    svg: lying({
      hair: 'bun', outfit: 'rose', cardigan: true, glasses: true, mood: 'warm', tilt: -10,
      side: g(p('M0 -2.5 C-6 -7 -5.5 -12.5 -2.6 -12.5 C-1 -12.5 0 -11 0 -10 C0 -11 1 -12.5 2.6 -12.5 C5.5 -12.5 6 -7 0 -2.5Z', 'sh f-accent'), 'translate(16 -40)', 'heart'),
    }),
    w: 34, h: 56, humans: 1, kind: 'human',
  }),

  polite: (o) => ({
    svg: lying({ hair: o.flip ? 'long' : 'short', facial: o.flip ? null : 'mustache', outfit: o.flip ? 'mustard' : 'sage', mood: 'happy', tilt: o.flip ? 12 : -12 }),
    w: 56, h: LY.h, humans: 1, kind: 'human',
  }),
};

// ───────────────────────── قطار، سوزن‌بان، اهرم ─────────────────────────
/** راننده‌ی قطار با استکان چای (مرحله‌ی «شوخی بی‌ضرر»)؛ مرکز سر روی (0,0) */
export function driver() {
  return (
    p('M-12 22 Q-12 11 0 11 Q12 11 12 22', 'sh f-navy') +
    g(headShape({ hair: 'cap', facial: 'mustache', mood: 'happy' }), '') +
    g(
      p('M-3.4 -9 Q-4.4 -4 -2 -1.4 Q-3.6 1.6 -2.8 3.4 L2.8 3.4 Q3.6 1.6 2 -1.4 Q4.4 -4 3.4 -9Z', 'sh f-tea') +
      ell(0, 4.4, 6, 1.6, 'sh f-paper2') +
      p('M-1 -12 Q-3 -15 -1 -18 M1.6 -12.4 Q3.6 -15.4 1.6 -18.4', 'ln thin steam'),
      'translate(13 12)', 'driver-tea')
  );
}

export function trolley({ passengers = 0, driver: withDriver = false, smoky = false } = {}) {
  const wheel = (x) => `<g class="wheel" transform="translate(${x} -10)">${circ(0, 0, 10) + p('M-7 0 L7 0 M0 -7 L0 7', 'ln thin') + circ(0, 0, 2.6, 'ink')}</g>`;
  const windows = [-55, -31, -7, 17].map((x, k) => {
    let w = rect(x, -71, 18, 22, 3, 'sh f-glass');
    if (k < passengers && !(withDriver && k === 0)) {
      w += g(headShape({ ...crowdLook(k + 2), mood: 'scared' }), `translate(${x + 9} -57) scale(0.62)`);
    }
    return w;
  }).join('');
  // قطار دودزا: دودکش روی سقف و لکه‌های دوده روی بدنه
  const stack = smoky
    ? rect(6, -117, 15, 26, 2, 'sh f-gray') + rect(2.5, -122, 22, 6, 2, 'sh f-ink')
    : '';
  const soot = smoky
    ? p('M-60 -44 q6 -5 12 0 q5 -4 10 1 M8 -46 q5 -4 11 0 M-34 -30 q6 -4 12 1', 'ln soot') + ell(14, -88, 9, 3, 'soot-f')
    : '';
  const cab = withDriver ? g(driver(), 'translate(-46 -62) scale(0.62)', 'driver') : '';
  return (
    stack +
    p('M28 -91 L58 -130', 'ln thick') + circ(60, -132, 3.4) +
    rect(-58, -24, 116, 8, 2, 'ink') +
    p('M-69 -22 L-69 -72 Q-69 -84 -57 -84 L60 -84 Q71 -84 71 -72 L71 -22Z', 'sh f-accent body') +
    p('M-69 -40 L71 -40', 'ln thin') + p('M-69 -36 L71 -36', 'ln thin') +
    rect(-64, -93, 128, 10, 5, 'sh f-paper') +
    windows + cab + soot +
    rect(43, -73, 22, 49, 2.5, 'sh f-paper2') + p('M54 -73 L54 -24', 'ln thin') +
    p('M-69 -22 L-80 -12 L-62 -12', 'sh f-paper2') +
    circ(-70, -30, 4.4, 'sh f-gold headlight') +
    g(rect(-27, -7.5, 54, 15, 3, 'sh f-paper') + txt(0, 4, 'ناکجاآباد', 8.4, 'tx'), 'translate(-26 -102)') +
    g(circ(0, 0, 7, 'sh f-paper') + txt(0, 3.6, '۷', 9.4, 'tx'), 'translate(-50 -30)') +
    wheel(-38) + wheel(38)
  );
}

/** سوزن‌بان؛ بازوی راستش جداگانه در صحنه کشیده می‌شود تا به اهرم برسد */
export function switchman(look = SWITCHMAN) {
  return human({ ...look, mood: 'worried', tied: false, arms: 'none' }) + p('M10 -41 Q16 -31 14 -23');
}

/** پل عابر پیاده: عرشه از x1 تا x2 در ارتفاع deckY، پایه‌ها و پله‌ها تا groundY */
export function footbridge(x1, x2, deckY, groundY) {
  const w = x2 - x1;
  let rail = '';
  for (let x = x1 + 10; x < x2 - 4; x += 17) rail += p(`M${x} ${deckY} L${x} ${deckY - 22}`, 'ln thin');
  const stairs = (x0, dir) => {
    const run = 70;
    const h = groundY - deckY - 10;
    const n = 8;
    let d = `M${x0} ${deckY + 10}`;
    for (let k = 1; k <= n; k++) d += ` L${x0 - dir * (run * (k - 1)) / n - dir * run / n} ${deckY + 10 + (h * (k - 1)) / n} L${x0 - dir * (run * k) / n} ${deckY + 10 + (h * k) / n}`;
    return p(`${d} L${x0} ${groundY} Z`, 'sh f-paper2') +
      p(`M${x0} ${deckY - 22} L${x0 - dir * run} ${groundY - 24} L${x0 - dir * run} ${groundY - 2}`, 'ln thin');
  };
  return (
    stairs(x1, 1) + stairs(x2, -1) +
    rect(x1 + 6, deckY + 10, 12, groundY - deckY - 10, 1.5, 'sh f-paper2') + rect(x2 - 18, deckY + 10, 12, groundY - deckY - 10, 1.5, 'sh f-paper2') +
    rail + p(`M${x1} ${deckY - 22} L${x2} ${deckY - 22}`, 'ln') +
    rect(x1, deckY, w, 10, 2, 'sh f-mustard') + p(`M${x1 + 4} ${deckY + 5} L${x2 - 4} ${deckY + 5}`, 'ln thin')
  );
}

/** نشانه‌ی قرعه: تاس کوچک با خال‌های 1 تا 6 */
export function dice(face = 1) {
  const pip = {
    1: [[0, 0]], 2: [[-3.4, -3.4], [3.4, 3.4]], 3: [[-3.4, -3.4], [0, 0], [3.4, 3.4]],
    4: [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]], 5: [[-3.4, -3.4], [3.4, -3.4], [0, 0], [-3.4, 3.4], [3.4, 3.4]],
    6: [[-3.4, -3.8], [3.4, -3.8], [-3.4, 0], [3.4, 0], [-3.4, 3.8], [3.4, 3.8]],
  }[face] || [];
  return rect(-8, -8, 16, 16, 3.4, 'sh f-paper') + pip.map(([x, y]) => circ(x, y, 1.5, 'ink')).join('');
}

export function leverBase() {
  return rect(-16, -9, 32, 11, 3, 'sh f-ink') + circ(0, -7, 4.4, 'sh f-paper2');
}

export function leverArm() {
  return p('M0 -7 L0 -62', 'ln lever-stick') + circ(0, -64, 7, 'sh f-accent knob');
}

// ───────────────────────── صحنه‌ی صفحه‌ی اول ─────────────────────────
// viewBox 0 0 900 300. ریل اصلی وسط صحنه است و قطار فقط روی آن راه می‌رود. اهرم و سوزن‌بان
// جلوتر و پایین‌تر، کنار ریل روی زمین ایستاده‌اند و از پایین چرخ‌ها پایین‌ترند؛ پس قطار هیچ‌وقت از رویشان رد نمی‌شود.
// بعد از اهرم (در جهت حرکت قطار، یعنی سمت چپ) ریل دو شاخه می‌شود و شاخه‌ی دوم به سمت جلو می‌پیچد.
export const HERO_RAIL_Y = 190;
export const HERO_TROLLEY_PARK = 720;

const HERO_BRANCH = [[448, 190], [388, 190], [338, 242], [258, 242]]; // محور شاخه‌ی دوم (بزیه‌ی مکعبی)

function bezierAt([a, b, c, d], t) {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const dk = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
  const sum = (w, i) => w.reduce((s, wj, j) => s + wj * [a, b, c, d][j][i], 0);
  return { x: sum(k, 0), y: sum(k, 1), dx: sum(dk, 0), dy: sum(dk, 1) };
}

function heroTrack() {
  const y = HERO_RAIL_Y;
  const tie = (x1, y1, x2, y2) => `<line class="tie" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  let ties = '';
  for (let x = 0; x <= 912; x += 38) ties += tie(x, y - 12, x, y + 12);
  // تراورس‌های شاخه: روی پیچ عمود بر مسیر، بعد صاف تا لبه‌ی صحنه
  for (const t of [0.35, 0.55, 0.75, 0.95]) {
    const { x, y: by, dx, dy } = bezierAt(HERO_BRANCH, t);
    const n = Math.hypot(dx, dy);
    const [nx, ny] = [-dy / n * 12, dx / n * 12];
    ties += tie(x - nx, by - ny, x + nx, by + ny);
  }
  const by = HERO_BRANCH[3][1];
  for (let x = 224; x >= -10; x -= 38) ties += tie(x, by - 12, x, by + 12);
  const branch = (dy) => {
    const [a, b, c, d] = HERO_BRANCH.map(([px, py], i) => [px + (i < 2 ? dy * 1.4 : dy), py + dy]);
    return p(`M${a[0]} ${a[1]} C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]} H-20`, 'rail');
  };
  return ties +
    p(`M-20 ${y - 6} H920`, 'rail') + p(`M-20 ${y + 6} H920`, 'rail') +
    branch(-6) + branch(6);
}

/**
 * کل صحنه‌ی صفحه‌ی اول. trolley: نشانه‌گذاری قطار که بیرون ساخته می‌شود (متحرک یا ثابت).
 * سوزن‌بان کلاس hero-sw دارد تا دست تکان دادنش در CSS انیمیت شود.
 */
export function heroScene(trolleyMarkup) {
  return `<g class="scenery">${scenery()}</g>` +
    heroTrack() +
    trolleyMarkup +
    g(leverBase() + g(leverArm(), 'rotate(-20 0 -7)'), 'translate(500 282)') +
    g(human({ ...SWITCHMAN, mood: 'happy', tied: false, arms: 'cheer' }), 'translate(540 294) scale(1.15)', 'hero-sw');
}

// ───────────────────────── پس‌زمینه ─────────────────────────
export function scenery() {
  return (
    g(
      circ(96, 62, 24, 'bg-sun') +
      p('M96 26 L96 18 M96 98 L96 106 M60 62 L52 62 M132 62 L140 62 M71 37 L65 31 M121 37 L127 31 M71 87 L65 93 M121 87 L127 93', 'bg'),
      '', 'sun') +
    p('M520 128 L640 52 Q652 44 664 52 L800 128', 'bg') +
    p('M626 61 L640 70 L652 62 L664 71 L676 62', 'bg') +
    p('M-10 132 Q110 104 250 126 Q360 108 470 128 Q560 114 660 130 Q780 116 910 130', 'bg') +
    g(p('M0 0 q11 -15 28 -7 q13 -11 26 2 q13 0 11 11 h-63 q-9 -2 -2 -6z', 'bg-cloud'), 'translate(214 50)', 'cloud') +
    g(p('M0 0 q8 -11 20 -5 q10 -8 19 2 q10 0 8 8 h-46 q-7 -2 -1 -5z', 'bg-cloud'), 'translate(418 28)', 'cloud c2') +
    g(p('M0 0 q4 -5 8 0 q4 -5 8 0', 'bg') + p('M18 -10 q3 -4 6 0 q3 -4 6 0', 'bg'), 'translate(330 74)', 'birds')
  );
}

export function tufts() {
  const at = [[40, 382], [150, 396], [430, 378], [520, 400], [760, 392], [860, 250], [700, 222], [390, 250], [80, 250]];
  return at.map(([x, y]) => p(`M${x} ${y} l3 -9 M${x + 5} ${y} l1 -11 M${x + 10} ${y} l-2 -8`, 'bg tuft')).join('');
}

// ───────────────────────── جلوه‌ها ─────────────────────────
export const IMPACT_WORDS = {
  human: ['شَتَلَق!', 'تَق!', 'دَرَق!', 'گُرومپ!', 'شِتَرَق!'],
  metal: ['دِلِنگ!', 'تَلَق!'],
  glass: ['شَلَپ!', 'جِرینگ!'],
  ceramic: ['جیرینگ!'],
  food: ['خِرچ!'],
  paper: ['خِش‌خِش!', 'پِف!'],
  animal: ['میو؟!', 'تَپ!'],
  box: ['بُنگ!'],
  boom: ['بـــوم!'],
  fog: ['؟!'],
  wall: ['گرومب!'],
};

/** حباب «شتلق» — شکل نامنظم با متن */
export function impactBubble(word) {
  return (
    p('M-34 -4 Q-42 -20 -24 -22 Q-20 -36 -4 -30 Q6 -42 18 -28 Q36 -30 32 -12 Q46 -2 30 10 Q32 26 14 20 Q4 32 -8 22 Q-26 30 -28 14 Q-46 10 -34 -4Z', 'sh f-paper bubble') +
    txt(0, 5, word, 15, 'tx bubble-text')
  );
}

export function particles(type, n = 10) {
  const out = [];
  for (let k = 0; k < n; k++) {
    let s;
    switch (type) {
      case 'coins': s = circ(0, 0, 4, 'sh f-gold'); break;
      case 'rice': s = ell(0, 0, 2.6, 1.2, 'sh f-paper'); break;
      case 'paper': s = rect(-4, -5, 8, 10, 1, 'sh f-paper'); break;
      case 'tea': s = circ(0, 0, 2.6, 'sh f-tea'); break;
      case 'photos': s = rect(-4.5, -4.5, 9, 9, 1, `sh thin f-${['sky', 'rose', 'mustard', 'sage'][k % 4]}`); break;
      case 'water': s = circ(0, 0, 2.6, 'sh f-sky'); break;
      case 'bolts': s = k % 2 ? circ(0, 0, 3, 'sh f-gray') : rect(-4, -2, 8, 4, 1, 'sh f-gray'); break;
      case 'bricks': s = rect(-5, -3, 10, 6, 1, 'sh f-tea'); break;
      case 'boom': s = p('M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z', 'sh f-mustard'); break;
      default: s = p('M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4Z', 'sh f-mustard');
    }
    out.push(s);
  }
  return out;
}

export function smokePuff(dark = false) {
  return dark ? circ(0, 0, 8, 'sh f-gray smoke smog') : circ(0, 0, 7, 'sh f-paper smoke');
}

export function stamp(text) {
  return g(rect(-62, -18, 124, 36, 4, 'stamp-box') + txt(0, 6, text, 16, 'tx stamp-text'), 'rotate(-8)');
}

export { p, circ, ell, rect, txt, g };
