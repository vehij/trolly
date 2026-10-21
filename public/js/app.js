// جریان کلی بازی: لودر، صفحه‌ی شروع، مرحله‌ها، نتیجه‌ها و جمع‌بندی پایانی
import { LEVELS, DEFAULT_LABELS } from './levels.js';
import { createScene } from './scene.js';
import * as A from './art.js';
import * as sound from './audio.js';

const $ = (s, root = document) => root.querySelector(s);
const app = $('#app');
const fa = A.fa;
const faNum = (n) => Math.round(n).toLocaleString('fa-IR');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOTAL = LEVELS.length;

// ───────── حافظه‌ی محلی ─────────
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(`sozanban:${k}`);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`sozanban:${k}`, JSON.stringify(v));
    } catch { /* ignore */ }
  },
};

function sessionId() {
  let id = store.get('session', null);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    store.set('session', id);
  }
  return id;
}

const state = {
  idx: 0,
  answers: {},
  stats: { levels: {}, players: 0 },
  scene: null,
  busy: false,
  ...store.get('progress', {}),
};
const save = () => store.set('progress', { idx: state.idx, answers: state.answers });

// ───────── API ─────────
async function api(path, opts = {}, timeout = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(path, { ...opts, signal: ctrl.signal, headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function loadStats() {
  try {
    state.stats = await api('/api/stats');
  } catch {
    state.stats = { levels: {}, players: 0, offline: true };
  }
}

async function sendVote(level, choice) {
  try {
    const r = await api('/api/vote', { method: 'POST', body: JSON.stringify({ session: sessionId(), level, choice }) });
    state.stats.levels[level] = { pull: r.pull, stay: r.stay };
    return { pull: r.pull, stay: r.stay };
  } catch {
    return null;
  }
}

// ───────── ابزارهای رابط کاربری ─────────
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function countUp(node, to, { dur = 900, suffix = '', from = 0 } = {}) {
  if (reduceMotion()) {
    node.textContent = faNum(to) + suffix;
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    node.textContent = faNum(from + (to - from) * e) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function splitWords(text) {
  return text
    .split(/(\s+)/)
    .map((w, i) => (/^\s+$/.test(w) ? w : `<span class="w" style="--i:${i / 2}">${w}</span>`))
    .join('');
}

function setSub(text) {
  const sub = $('#levelSub');
  sub.classList.remove('swap');
  void sub.offsetWidth;
  sub.textContent = text;
  sub.classList.add('swap');
}

function updateProgress() {
  const p = $('#progress');
  const ratio = state.idx / TOTAL;
  p.style.setProperty('--p', ratio.toFixed(4));
}

function totalDeaths() {
  return Object.values(state.answers).reduce((t, a) => t + (a.deaths || 0), 0);
}

function renderDeaths(animate = false) {
  const box = $('#deaths');
  const n = $('.deaths-n', box);
  const total = totalDeaths();
  const prev = Number(box.dataset.v || 0);
  box.dataset.v = total;
  if (animate && total !== prev) {
    countUp(n, total, { from: prev, dur: 700 });
    box.classList.remove('bump');
    void box.offsetWidth;
    box.classList.add('bump');
  } else n.textContent = faNum(total);
}

// تعویض صفحه با ترنزیشن
async function swap(build) {
  const old = app.firstElementChild;
  if (old && !reduceMotion()) {
    sound.play('page');
    await old.animate(
      [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateX(60px)', filter: 'blur(3px)' }],
      { duration: 320, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
    ).finished;
  }
  if (state.scene) {
    state.scene.destroy();
    state.scene = null;
  }
  app.innerHTML = '';
  const node = build();
  app.append(node);
  if (!reduceMotion()) {
    node.animate(
      [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  return node;
}

function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

// ───────── صفحه‌ی شروع ─────────
function heroSvg() {
  const ties = Array.from({ length: 25 }, (_, i) => `<line class="tie" x1="${i * 38}" y1="244" x2="${i * 38}" y2="268"/>`).join('');
  return `
  <svg class="hero-art" viewBox="0 0 900 300" aria-hidden="true">
    <g class="scenery">${A.scenery()}</g>
    ${ties}
    <path class="rail" d="M-20 250 H920"/><path class="rail" d="M-20 262 H920"/>
    <g transform="translate(140 288)">${A.leverBase()}<g transform="rotate(-20 0 -7)">${A.leverArm()}</g></g>
    <g transform="translate(186 290) scale(1.25)" class="hero-sw">${A.human({ ...A.SWITCHMAN, mood: 'happy', tied: false, arms: 'cheer' })}</g>
    <g class="hero-run"><g transform="translate(0 256)"><g class="trolley-bob">${A.trolley({ passengers: 2 })}</g></g></g>
  </svg>`;
}

function introScreen() {
  const answered = Object.keys(state.answers).length;
  const resume = state.idx > 0 && state.idx < TOTAL;
  const done = state.idx >= TOTAL;
  const players = state.stats.players;
  const node = html(`
    <section class="screen intro">
      <div class="hero">${heroSvg()}</div>
      <h1 class="intro-title">${splitWords('دردسرهای سوزن‌بان')}</h1>
      <p class="lead">${fa(TOTAL)} دوراهی اخلاقی، یکی از یکی عجیب‌تر. اهرم دست شماست؛ بعد از هر تصمیم می‌بینید بقیه‌ی مردم چه کردند.</p>
      <div class="cta">
        ${resume ? `<button class="btn btn-pull" data-act="resume">ادامه از مرحله‌ی ${fa(state.idx + 1)}</button>` : ''}
        ${done ? '<button class="btn btn-pull" data-act="end">دیدن نتیجه‌ی من</button>' : ''}
        <button class="btn ${resume || done ? '' : 'btn-pull'}" data-act="start">${answered ? 'از اول شروع کن' : 'شروع کن'}</button>
      </div>
      <p class="fine">رأی‌ها ناشناس ثبت می‌شوند.${players ? ` تا امروز <b class="players">${faNum(players)}</b> نفر سوزن‌بان شده‌اند.` : ''}</p>
      <ul class="howto">
        <li><span class="k">۱</span> سناریو را بخوانید</li>
        <li><span class="k">۲</span> اهرم را بکشید… یا نکشید</li>
        <li><span class="k">۳</span> ببینید چند درصد با شما هم‌نظرند</li>
      </ul>
    </section>`);
  node.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    sound.play('click');
    if (act === 'start') {
      state.idx = 0;
      state.answers = {};
      save();
      startGame();
    } else if (act === 'resume') startGame();
    else if (act === 'end') endScreen();
  });
  return node;
}

function showIntro() {
  document.body.dataset.screen = 'intro';
  $('#progress').hidden = true;
  $('#deaths').hidden = true;
  setSub('');
  hideResult();
  swap(introScreen);
}

// ───────── مرحله‌ها ─────────
function startGame() {
  document.body.dataset.screen = 'game';
  $('#progress').hidden = false;
  $('#deaths').hidden = false;
  renderDeaths();
  showLevel();
}

function showLevel() {
  const level = LEVELS[state.idx];
  if (!level) return endScreen();
  const labels = { ...DEFAULT_LABELS, ...level.labels };
  hideResult();
  updateProgress();
  setSub(`مرحله‌ی ${fa(state.idx + 1)} از ${fa(TOTAL)}: ${level.title}`);
  state.busy = false;

  swap(() => {
    const node = html(`
      <section class="screen game">
        <div class="stage-host"></div>
        <p class="question">${splitWords(level.text)}</p>
        <div class="choices">
          <button class="btn btn-pull choice" data-choice="pull" type="button"><span class="key">۱</span>${labels.pull}</button>
          <button class="btn btn-stay choice" data-choice="stay" type="button"><span class="key">۲</span>${labels.stay}</button>
        </div>
      </section>`);
    state.scene = createScene($('.stage-host', node), level, { onSfx: sound.play });
    for (const b of node.querySelectorAll('.choice')) {
      b.addEventListener('mouseenter', () => { if (!state.busy) { state.scene?.preview(b.dataset.choice); sound.play('hover'); } });
      b.addEventListener('focus', () => !state.busy && state.scene?.preview(b.dataset.choice));
      b.addEventListener('mouseleave', () => !state.busy && state.scene?.preview(null));
      b.addEventListener('blur', () => !state.busy && state.scene?.preview(null));
      b.addEventListener('click', () => choose(b.dataset.choice));
    }
    return node;
  });
}

async function choose(choice) {
  if (state.busy) return;
  state.busy = true;
  const level = LEVELS[state.idx];
  sound.play('click');
  const screen = $('.screen.game');
  screen.classList.add('chosen');
  screen.querySelector(`.choice[data-choice="${choice}"]`).classList.add('picked');

  const votePromise = sendVote(level.id, choice);
  const result = await state.scene.run(choice);
  if (!state.scene) return;

  let tally = await Promise.race([votePromise, wait(3000).then(() => null)]);
  const offline = !tally;
  if (!tally) {
    const base = state.stats.levels[level.id] || { pull: 0, stay: 0 };
    tally = { ...base, [choice]: base[choice] + 1 };
  }
  const total = tally.pull + tally.stay;
  const agree = total ? tally[choice] / total : 1;

  state.answers[level.id] = { choice, deaths: result.deaths, agree, pull: tally.pull, stay: tally.stay };
  save();
  renderDeaths(true);
  showResult({ level, choice, tally, agree, deaths: result.deaths, offline });
}

// ───────── نوار نتیجه ─────────
function showResult({ level, choice, tally, agree, deaths, offline }) {
  const bar = $('#resultBar');
  const total = tally.pull + tally.stay;
  const pct = Math.round(agree * 100);
  const labels = { ...DEFAULT_LABELS, ...level.labels };
  const pullPct = total ? Math.round((tally.pull / total) * 100) : 0;

  const main = $('.rb-main', bar);
  if (total <= 1) {
    main.innerHTML = 'شما <b>اولین نفری</b> هستید که به این سؤال جواب داده!';
  } else {
    main.innerHTML = `<b class="pct"><span class="n">۰</span>٪</b> از مردم با شما هم‌نظرند، <span class="dis">${fa(100 - pct)}٪</span> مخالف`;
    countUp($('.n', main), pct, { dur: 900 });
  }
  $('.rb-sub', bar).innerHTML =
    `<span class="seg">${labels.pull}: ${fa(pullPct)}٪</span>` +
    `<span class="seg">${labels.stay}: ${fa(100 - pullPct)}٪</span>` +
    `<span class="seg"><span class="votes">۰</span> رأی</span>` +
    (offline ? '<span class="seg offline">آمار آفلاین</span>' : '');
  countUp($('.votes', bar), total, { dur: 1100 });
  $('.rb-deaths', bar).innerHTML = deaths
    ? `<span class="skull">☠</span> ${fa(deaths)} نفر`
    : '<span class="ok">کسی آسیب ندید</span>';

  const fg = $('.pie-fg', bar);
  fg.style.strokeDasharray = '0 100';
  bar.dataset.choice = choice;
  bar.classList.add('show');
  document.body.classList.add('has-result');
  requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDasharray = `${pct} ${100 - pct}`; }));
  sound.play('result');
  const next = $('#nextBtn');
  next.innerHTML = state.idx + 1 >= TOTAL ? 'دیدن نتیجه‌ی نهایی <span class="arrow">←</span>' : 'بعدی <span class="arrow">←</span>';
  setTimeout(() => next.focus({ preventScroll: true }), 350);
}

function hideResult() {
  $('#resultBar').classList.remove('show');
  document.body.classList.remove('has-result');
}

$('#nextBtn').addEventListener('click', () => {
  if (!$('#resultBar').classList.contains('show')) return;
  sound.play('click');
  hideResult();
  state.idx += 1;
  save();
  if (state.idx >= TOTAL) endScreen();
  else showLevel();
});

// ───────── جمع‌بندی پایانی ─────────
function optionDeaths(level, choice) {
  if (level.deaths) return level.deaths[choice === 'pull' && level.stuck ? 'stay' : choice];
  const track = choice === 'pull' && !level.stuck ? level.bottom : level.top;
  return track.items.reduce((t, spec) => {
    if (spec.k === 'mystery') return t + spec.chance * spec.people;
    if (spec.k === 'fog') return t + 1.95;
    return t + A.ITEMS[spec.k](spec, 0, 0).humans * (spec.n || 1);
  }, 0);
}

function archetype() {
  const answers = LEVELS.map((l) => [l, state.answers[l.id]]).filter(([, a]) => a);
  const n = answers.length || 1;
  const pulls = answers.filter(([, a]) => a.choice === 'pull').length;
  const agreeCount = answers.filter(([, a]) => a.agree >= 0.5).length;
  const minDeaths = answers.reduce((t, [l]) => t + Math.min(optionDeaths(l, 'pull'), optionDeaths(l, 'stay')), 0);
  const excess = totalDeaths() - minDeaths;
  const pullRate = pulls / n;
  const agreeRate = agreeCount / n;
  let a;
  if (excess > 18) a = { name: 'هرج‌ومرج‌طلب', icon: '🔥', text: 'به نظر می‌رسد قطار برای شما بیشتر یک وسیله‌ی سرگرمی بود تا یک دوراهی اخلاقی. لطفاً هیچ‌وقت سوزن‌بان واقعی نشوید.' };
  else if (pullRate < 0.25) a = { name: 'تماشاگر بی‌طرف', icon: '🫣', text: 'شما ترجیح می‌دهید دست به اهرم نزنید. اگر اتفاقی بیفتد، دست‌کم تقصیر شما نبوده… یا بوده؟' };
  else if (excess <= 3 && pullRate > 0.4) a = { name: 'فایده‌گرای حسابگر', icon: '🧮', text: 'کمترین تلفات، بیشترین منفعت. ماشین‌حساب اخلاقی شما بی‌وقفه کار می‌کند؛ جرمی بنتام به شما افتخار می‌کند.' };
  else if (agreeRate > 0.75) a = { name: 'صدای اکثریت', icon: '📣', text: 'تصمیم‌هایتان تقریباً همیشه با بیشتر مردم یکی بود. اگر نظرسنجی بود، شما برنده‌اش بودید.' };
  else if (agreeRate < 0.4) a = { name: 'تک‌رو', icon: '🦄', text: 'شما معمولاً برخلاف جریان تصمیم می‌گیرید. یا خیلی جلوتر از بقیه‌اید، یا خیلی عقب‌تر.' };
  else a = { name: 'سوزن‌بانِ دودل', icon: '⚖️', text: 'گاهی کشیدید، گاهی نکشیدید؛ دقیقاً مثل بقیه‌ی ما آدم‌ها که هر بار قانع می‌شویم حق با ماست.' };
  return { ...a, pulls, agreeCount, n: answers.length };
}

function endScreen() {
  document.body.dataset.screen = 'end';
  hideResult();
  $('#progress').hidden = false;
  state.idx = TOTAL;
  updateProgress();
  setSub('پایان خط!');
  const deaths = totalDeaths();
  const arch = archetype();
  const rows = LEVELS.map((l, i) => {
    const a = state.answers[l.id];
    if (!a) return '';
    const labels = { ...DEFAULT_LABELS, ...l.labels };
    const pct = Math.round(a.agree * 100);
    return `<li style="--i:${i}">
      <span class="lv-n">${fa(i + 1)}</span>
      <span class="lv-t">${l.title}</span>
      <span class="chip ${a.choice}">${labels[a.choice]}</span>
      <span class="lv-agree" title="درصد هم‌نظرها"><i style="--w:${pct}%"></i><b>${fa(pct)}٪</b></span>
    </li>`;
  }).join('');

  swap(() => {
    const node = html(`
      <section class="screen end">
        <div class="end-hero">
          <h1>${splitWords('تمام شد، سوزن‌بان!')}</h1>
          <div class="big-stat"><span class="num">۰</span><span class="lbl">نفر در مجموع زیر قطار رفتند</span></div>
        </div>
        <div class="arch-card">
          <div class="arch-icon">${arch.icon}</div>
          <div>
            <div class="arch-kicker">تیپ اخلاقی شما</div>
            <div class="arch-name">${arch.name}</div>
            <p>${arch.text}</p>
          </div>
        </div>
        <div class="mini-stats">
          <div><b class="ms-1">۰</b><span>بار اهرم را کشیدید</span></div>
          <div><b class="ms-2">۰</b><span>بار با اکثریت هم‌نظر بودید</span></div>
          <div><b class="ms-3">۰</b><span>مرحله پشت سر گذاشتید</span></div>
        </div>
        <div class="cta">
          <button class="btn btn-pull" data-act="share">اشتراک‌گذاری نتیجه</button>
          <button class="btn" data-act="again">دوباره بازی کن</button>
        </div>
        <h2 class="list-title">تصمیم‌های شما</h2>
        <ol class="lv-list">${rows}</ol>
      </section>`);
    setTimeout(() => {
      countUp($('.big-stat .num', node), deaths, { dur: 1600 });
      countUp($('.ms-1', node), arch.pulls, { dur: 1200 });
      countUp($('.ms-2', node), arch.agreeCount, { dur: 1200 });
      countUp($('.ms-3', node), arch.n, { dur: 1200 });
      sound.play('fanfare');
      confetti(node);
    }, 400);
    node.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      sound.play('click');
      if (act === 'again') {
        state.idx = 0;
        state.answers = {};
        save();
        renderDeaths();
        startGame();
      } else if (act === 'share') {
        const text = `در «دردسرهای سوزن‌بان» ${fa(deaths)} نفر را زیر قطار فرستادم و تیپ اخلاقی‌ام شد «${arch.name}» ${arch.icon}\nتو چه می‌کنی؟`;
        const url = location.origin;
        try {
          if (navigator.share) await navigator.share({ title: 'دردسرهای سوزن‌بان', text, url });
          else {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            toast('متن نتیجه کپی شد!');
          }
        } catch { /* کاربر لغو کرد */ }
      }
    });
    return node;
  });
}

// کاغذرنگی‌های خطی
function confetti(root) {
  if (reduceMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const shapes = ['M0 0 L10 0', 'M0 0 Q5 -6 10 0', 'M0 -5 L5 5 L10 -5', 'M5 0 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0'];
  const colors = ['accent', 'teal', 'mustard', 'lilac', 'rose', 'blue'];
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.innerHTML = `<svg viewBox="-2 -8 14 16"><path d="${shapes[i % shapes.length]}" style="stroke:var(--${colors[i % colors.length]})"/></svg>`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 900}deg`);
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
    layer.append(s);
  }
  root.append(layer);
  setTimeout(() => layer.remove(), 5500);
}

// ───────── صدا و کیبورد ─────────
function renderSoundBtn() {
  const b = $('#soundBtn');
  const on = sound.isEnabled();
  b.classList.toggle('off', !on);
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'قطع صدا' : 'وصل صدا');
}
$('#soundBtn').addEventListener('click', () => {
  sound.setEnabled(!sound.isEnabled());
  renderSoundBtn();
  sound.play('click');
});
renderSoundBtn();

$('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  sound.play('click');
  showIntro();
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  if (document.body.dataset.screen === 'game' && !state.busy) {
    if (key === '1' || key === '۱') $('.choice[data-choice="pull"]')?.click();
    if (key === '2' || key === '۲') $('.choice[data-choice="stay"]')?.click();
  }
  if ((key === 'Enter' || key === ' ') && $('#resultBar').classList.contains('show') && document.activeElement?.id !== 'nextBtn') {
    e.preventDefault();
    $('#nextBtn').click();
  }
});

// ───────── راه‌اندازی ─────────
async function boot() {
  const t0 = performance.now();
  const fonts = document.fonts?.ready ?? Promise.resolve();
  await Promise.race([Promise.all([fonts, loadStats()]), wait(3500)]);
  const minShow = reduceMotion() ? 0 : 1700;
  await wait(Math.max(0, minShow - (performance.now() - t0)));
  const loader = $('#loader');
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 900);
  document.body.classList.add('ready');
  const deep = location.hash.match(/^#level-(\d+)$/);
  if (deep && LEVELS[deep[1] - 1]) {
    state.idx = deep[1] - 1;
    history.replaceState(null, '', location.pathname);
    startGame();
  } else showIntro();
}
boot();
