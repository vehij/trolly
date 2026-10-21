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
  if (o.tie) s += p('M0 -45 L-2 -38 L0 -30 L2 -38Z', 'sh f-gold');
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
  if (o.tie) s += p('M0 -25 L-2.4 -17 L0 -9 L2.4 -17Z', 'sh f-gold');
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
  person: (o, i, seed) => ({ svg: lying({ ...crowdLook(i + seed), mood: o.mood || 'scared', tilt: tiltFor(i) }), ...LY, humans: 1, kind: 'human' }),

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

  tea: () => ({
    svg: g(
      ell(0, -2.4, 17, 3.6, 'sh f-paper2') +
      p('M-7.5 -31 Q-9.6 -21 -4.8 -14.6 Q-8.4 -8.4 -6.4 -4.4 L6.4 -4.4 Q8.4 -8.4 4.8 -14.6 Q9.6 -21 7.5 -31Z', 'sh f-tea') +
      p('M-7 -27 L7 -27', 'ln thin') + ell(0, -31, 7.5, 1.7, 'sh') +
      p('M-3 -37 Q-6 -42 -3 -47 Q0 -52 -3 -57', 'ln thin steam') +
      p('M3 -38 Q0 -43 3 -48 Q6 -53 3 -58', 'ln thin steam s2') +
      rect(12, -9, 6.5, 6.5, 1.2) + rect(15.5, -15.6, 6.5, 6.5, 1.2), 'scale(1.25)'),
    w: 44, h: 72, humans: 0, kind: 'glass', sfx: 'glass', burst: 'tea',
  }),

  piggy: () => ({
    svg: g(
      rect(-12, -9, 5, 9, 1.5, 'sh f-rose') + rect(6, -9, 5, 9, 1.5, 'sh f-rose') +
      p('M18 -20 q6 -1 4 -6 q-4 -1 -1.6 3.4', 'ln') +
      ell(0, -19, 19, 13.5, 'sh f-rose') +
      ell(-18, -20, 4.4, 5.4, 'sh f-rose') + p('M-19.4 -21.4 L-19.4 -21 M-16.8 -21.4 L-16.8 -21', 'ln eye') +
      p('M-9 -30 L-6 -38 L-1.6 -31.4', 'sh f-rose') + circ(-10, -23, 1.3, 'ink') +
      p('M-3.6 -31.4 L5 -31.4', 'ln thick') +
      g(circ(0, 0, 5.4, 'sh f-gold') + p('M0 -2.6 L0 2.6', 'ln thin'), 'translate(1 -42)', 'coin-float'), 'scale(1.15)'),
    w: 50, h: 58, humans: 0, kind: 'ceramic', sfx: 'coins', burst: 'coins',
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

  crab: (o, i) => ({
    svg: g(
      p('M-9 -6 L-16 0 M-11 -9 L-19 -5 M9 -6 L16 0 M11 -9 L19 -5') +
      p('M-12 -12 Q-20 -17 -19 -25 M12 -12 Q20 -17 19 -25') +
      p('M-19 -25 q-6 -2 -3 -9 q2 3 6 2 q-1 4 -3 7Z', 'sh f-red claw') +
      p('M19 -25 q6 -2 3 -9 q-2 3 -6 2 q1 4 3 7Z', 'sh f-red claw c2') +
      ell(0, -11, 13.5, 8.5, 'sh f-red') +
      p('M-4 -18 L-5 -25 M4 -18 L5 -25') + circ(-5, -26.4, 2.6) + circ(5, -26.4, 2.6) + circ(-5, -26, 1, 'ink') + circ(5, -26, 1, 'ink') +
      p(i % 2 ? 'M-3 -8 Q0 -10.5 3 -8' : 'M-3 -9 Q0 -6.5 3 -9') +
      p('M-14 -10 Q0 -6 14 -10', 'rope'), 'scale(1.05)'),
    w: 40, h: 34, humans: 0, kind: 'animal', sfx: 'squeak',
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

  books: () => ({
    svg:
      rect(-24, -11, 48, 11, 2, 'sh f-blue') + p('M-20 -6 L20 -6', 'ln thin') +
      rect(-21, -22, 44, 11, 2, 'sh f-mustard') + txt(1, -13.6, 'شیمی', 6.4, 'tx') +
      rect(-25, -33, 46, 11, 2, 'sh f-sage') + txt(-2, -24.6, 'تست زیست', 6.4, 'tx') +
      rect(-19, -44, 40, 11, 2, 'sh f-rose') + txt(1, -35.6, 'جمع‌بندی', 6.4, 'tx') +
      p('M-14 -44 L-14 -53 L4 -53 L4 -44', 'sh f-paper') + p('M-11 -50 L1 -50 M-11 -47 L-2 -47', 'ln thin') +
      g(p('M0 0 L26 0 L30 2.4 L26 4.8 L0 4.8Z', 'sh f-mustard') + p('M26 0 L26 4.8', 'ln thin'), 'translate(-6 -60) rotate(-14)'),
    w: 52, h: 66, humans: 0, kind: 'paper', sfx: 'paper', burst: 'paper',
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

  designer: () => ({
    svg: lying({
      hair: 'beret', outfit: 'lilac', glasses: true, facial: 'beard', mood: 'scared', tilt: -10,
      prop: g(rect(-11, -7, 22, 15, 2, 'sh f-paper2') + p('M-7 2 L-1 2 Q2 2 2 -1 L2 -3 M4 -4 L8 1', 'ln thin') + p('M-13 8 L13 8', 'ln thick'), 'translate(0 -6)'),
    }),
    w: 30, h: LY.h, humans: 1, kind: 'human',
  }),

  player: (o, i, seed) => ({
    svg: lying({ ...crowdLook(i * 2 + seed + 1), mood: 'scared', tilt: tiltFor(i), prop: phoneSvg(0, -2) }),
    ...LY, humans: 1, kind: 'human',
  }),

  guest: (o, i, seed) => ({
    svg: lying({
      ...crowdLook(i * 3 + seed), mood: 'happy', tilt: tiltFor(i),
      prop: ell(0, -6, 8, 3, 'sh f-paper2') + p('M-5 -8 Q0 -13 5 -8', 'sh f-gold'),
    }),
    ...LY, humans: 1, kind: 'human',
  }),

  dj: () => ({
    svg:
      g(rect(-11, -30, 22, 30, 3, 'sh f-ink') + circ(0, -20, 6, 'sh f-paper2') + circ(0, -20, 2, 'ink') + circ(0, -7, 3.4, 'sh f-paper2'), 'translate(26 12)') +
      lying({ hair: 'spiky', outfit: 'ink', headphones: true, shades: true, mood: 'happy', tilt: -10 }) +
      g(txt(0, 0, '♪', 12, 'tx note'), 'translate(-22 -48)') + g(txt(0, 0, '♫', 14, 'tx note n2'), 'translate(30 -40)'),
    w: 56, h: 56, humans: 1, kind: 'human', sfx: 'scratch',
  }),

  polite: (o) => ({
    svg: lying({ hair: o.flip ? 'long' : 'short', facial: o.flip ? null : 'mustache', outfit: o.flip ? 'mustard' : 'sage', mood: 'happy', tilt: o.flip ? 12 : -12 }),
    w: 56, h: LY.h, humans: 1, kind: 'human',
  }),
};

// ───────────────────────── قطار، سوزن‌بان، اهرم ─────────────────────────
export function trolley({ passengers = 0 } = {}) {
  const wheel = (x) => `<g class="wheel" transform="translate(${x} -10)">${circ(0, 0, 10) + p('M-7 0 L7 0 M0 -7 L0 7', 'ln thin') + circ(0, 0, 2.6, 'ink')}</g>`;
  const windows = [-55, -31, -7, 17].map((x, k) => {
    let w = rect(x, -71, 18, 22, 3, 'sh f-glass');
    if (k < passengers) {
      w += g(headShape({ ...crowdLook(k + 2), mood: 'scared' }), `translate(${x + 9} -57) scale(0.62)`);
    }
    return w;
  }).join('');
  return (
    p('M28 -91 L58 -130', 'ln thick') + circ(60, -132, 3.4) +
    rect(-58, -24, 116, 8, 2, 'ink') +
    p('M-69 -22 L-69 -72 Q-69 -84 -57 -84 L60 -84 Q71 -84 71 -72 L71 -22Z', 'sh f-accent body') +
    p('M-69 -40 L71 -40', 'ln thin') + p('M-69 -36 L71 -36', 'ln thin') +
    rect(-64, -93, 128, 10, 5, 'sh f-paper') +
    windows +
    rect(43, -73, 22, 49, 2.5, 'sh f-paper2') + p('M54 -73 L54 -24', 'ln thin') +
    p('M-69 -22 L-80 -12 L-62 -12', 'sh f-paper2') +
    circ(-70, -30, 4.4, 'sh f-gold headlight') +
    g(rect(-27, -7.5, 54, 15, 3, 'sh f-paper') + txt(0, 4, 'ناکجاآباد', 8.4, 'tx'), 'translate(-26 -102)') +
    g(circ(0, 0, 7, 'sh f-paper') + txt(0, 3.6, '۷', 9.4, 'tx'), 'translate(-50 -30)') +
    wheel(-38) + wheel(38)
  );
}

/** سوزن‌بان؛ بازوی راستش جداگانه در صحنه کشیده می‌شود تا به اهرم برسد */
export function switchman() {
  return human({ ...SWITCHMAN, mood: 'worried', tied: false, arms: 'none' }) + p('M10 -41 Q16 -31 14 -23');
}

export function leverBase() {
  return rect(-16, -9, 32, 11, 3, 'sh f-ink') + circ(0, -7, 4.4, 'sh f-paper2');
}

export function leverArm() {
  return p('M0 -7 L0 -62', 'ln lever-stick') + circ(0, -64, 7, 'sh f-accent knob');
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
      case 'boom': s = p('M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z', 'sh f-mustard'); break;
      default: s = p('M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4Z', 'sh f-mustard');
    }
    out.push(s);
  }
  return out;
}

export function smokePuff() {
  return circ(0, 0, 7, 'sh f-paper smoke');
}

export function stamp(text) {
  return g(rect(-62, -18, 124, 36, 4, 'stamp-box') + txt(0, 6, text, 16, 'tx stamp-text'), 'rotate(-8)');
}

export { p, circ, ell, rect, txt, g };
