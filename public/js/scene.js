// صحنه‌ی هر مرحله: ساخت SVG، انیمیشن «طراحی با قلم»، اهرم، حرکت قطار و برخوردها
import * as A from './art.js';

const NS = 'http://www.w3.org/2000/svg';
export const W = 900;
export const H = 440;
const YT = 160; // ریل بالا (اگر کاری نکنید)
const YB = 330; // ریل پایین (اگر اهرم را بکشید)
const SX = 560; // محل سوزن (دوراهی)
const START_X = 830; // جای ایستادن قطار پیش از تصمیم
const FRONT = 80; // فاصله‌ی دماغه‌ی قطار از مرکزش
const PIVOT = { x: 650, y: 331 };
const SHOULDER = { x: 684, y: 290.8 };
const LEVER_STAY = -22;
const LEVER_PULL = 18;
const LOOP_ONE = `A 70 70 0 1 1 250 20 A 70 70 0 1 1 250 ${YT}`;

const PATHS = {
  topDraw: `M 960 ${YT} L -40 ${YT}`,
  bottomDraw: `M ${SX} ${YT} C 478 ${YT} 446 ${YB} 350 ${YB} L -40 ${YB}`,
  loopDraw: `M 960 ${YT} L 250 ${YT} ${LOOP_ONE}`,
  top: `M 960 ${YT} L -260 ${YT}`,
  bottom: `M 960 ${YT} L ${SX} ${YT} C 478 ${YT} 446 ${YB} 350 ${YB} L -260 ${YB}`,
  loop: `M 960 ${YT} L 250 ${YT} ${LOOP_ONE} ${LOOP_ONE}`,
};

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function el(tag, attrs = {}, html = '') {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
}

function rollFog() {
  const r = Math.random();
  if (r < 0.35) return 0;
  if (r < 0.6) return 1;
  if (r < 0.75) return 2;
  if (r < 0.9) return 4;
  return 8;
}

function fogCloud(cx, y) {
  let s = '';
  const puffs = [[-96, -16, 30], [-60, -34, 36], [-14, -40, 40], [34, -34, 36], [80, -22, 32], [104, -6, 22], [-112, -2, 20], [0, -10, 46]];
  for (const [x, yy, r] of puffs) s += A.circ(x, yy, r, 'sh f-fog');
  s += A.txt(-40, -22, '؟', 26, 'tx fog-q') + A.txt(30, -30, '؟', 20, 'tx fog-q q2') + A.txt(76, -8, '؟', 16, 'tx fog-q q3');
  return `<g transform="translate(${cx} ${y})"><g class="fog-cloud">${s}</g></g>`;
}

export function createScene(host, level, { onSfx = () => {}, seed = hash(level.id) } = {}) {
  const sfx = (name, opts) => onSfx(name, opts);
  const isLoop = level.top.special === 'loop';
  let destroyed = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms);
    timers.add(t);
  };
  let raf = 0;

  // ── ریشه
  const stage = document.createElement('div');
  stage.className = 'stage';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scene', role: 'img', 'aria-label': level.text, 'data-level': level.id });
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  stage.append(svg, overlay);
  host.append(stage);

  // ── آیتم‌ها
  function expand(track, branch) {
    const list = [];
    for (const spec of track.items) {
      const n = spec.n || 1;
      for (let i = 0; i < n; i++) {
        const art = A.ITEMS[spec.k](spec, i + (branch === 'bottom' ? 3 : 0), seed);
        list.push({ spec, art, i, branch, humans: art.humans });
      }
    }
    return list;
  }
  function layout(list, cx, gap = 6) {
    const total = list.reduce((t, it) => t + it.art.w, 0) + gap * Math.max(0, list.length - 1);
    let x = cx + total / 2;
    for (const it of list) {
      it.x = x - it.art.w / 2;
      x -= it.art.w + gap;
    }
    return total;
  }

  const topItems = expand(level.top, 'top');
  const bottomItems = expand(level.bottom, 'bottom');
  layout(topItems, 300);
  layout(bottomItems, 196);

  // مه: آدم‌های پنهان پشت مه از قبل قرعه‌کشی می‌شوند
  const fogItem = bottomItems.find((it) => it.art.random === 'fog');
  let fogCount = 0;
  if (fogItem) {
    fogCount = rollFog();
    const hidden = [];
    for (let i = 0; i < fogCount; i++) {
      hidden.push({ spec: { k: 'person' }, art: A.ITEMS.person({}, i + 4, seed), i, branch: 'bottom', humans: 1, veiled: true });
    }
    const gap = fogCount > 5 ? 0 : 6;
    layout(hidden, fogItem.x, gap);
    bottomItems.splice(bottomItems.indexOf(fogItem), 1, ...hidden);
  }
  // جعبه‌ی شانسی: محتوا از قبل مشخص است اما تا لحظه‌ی آخر پنهان می‌ماند
  for (const it of [...topItems, ...bottomItems]) {
    if (it.art.random === 'mystery') it.mystery = Math.random() < it.spec.chance ? it.spec.people : 0;
  }

  function itemSvg(it, y) {
    const cls = ['item', `k-${it.spec.k}`, it.art.kind === 'human' ? 'human' : '', it.veiled ? 'veiled' : ''].join(' ');
    const delay = rand(0, 2).toFixed(2);
    return `<g class="${cls}" transform="translate(${it.x.toFixed(1)} ${y})"><g class="body" style="animation-delay:-${delay}s">${it.art.svg}</g></g>`;
  }

  // ── ساخت SVG
  const railsTop = isLoop ? PATHS.loopDraw : PATHS.topDraw;
  svg.innerHTML = `
    <g class="scenery">${A.scenery()}${A.tufts()}</g>
    <g class="ties"></g>
    <g class="rails"></g>
    <path class="preview-line pv-line-stay" d="${isLoop ? PATHS.loopDraw : `M ${SX} ${YT} L -40 ${YT}`}"/>
    <path class="preview-line pv-line-pull" d="${PATHS.bottomDraw}"/>
    ${isLoop ? A.g(A.txt(0, 6, '∞', 40, 'tx loop-sign'), 'translate(250 96)', 'loop-mark') : ''}
    <g class="items items-top">${topItems.map((it) => itemSvg(it, YT)).join('')}</g>
    <g class="items items-bottom">${bottomItems.map((it) => itemSvg(it, YB)).join('')}</g>
    <g class="decor">${fogItem ? fogCloud(fogItem.x, YB) : ''}</g>
    <g class="lever-zone">
      <g transform="translate(${PIVOT.x} 338)">${A.leverBase()}</g>
      <g class="lever-wrap"><g class="lever-arm" transform="translate(${PIVOT.x} 338) rotate(${LEVER_STAY} 0 -7)">${A.leverArm()}</g></g>
      ${level.stuck ? A.g(A.rect(0, 0, 26, 30, 1.5, 'sh f-paper') + A.p('M5 9 L21 9 M5 14 L21 14 M5 19 L15 19', 'ln thin') + A.circ(13, 1, 2.4, 'sh f-accent'), `translate(${PIVOT.x - 52} 268) rotate(-6)`, 'form-note') : ''}
      <g transform="translate(696 340) scale(1.2)" class="switchman"><g class="sw-body">${A.switchman()}</g></g>
      <path class="ln sw-arm" d=""/>
      <circle class="sh skin sw-hand" r="3.6" cx="0" cy="0"/>
    </g>
    <g class="trolley-g" transform="translate(${START_X + 260} ${YT})"><g class="trolley-bob">${A.trolley({ passengers: level.passengers || 0 })}</g></g>
    <g class="fx"></g>
    <path class="measure m-top" d="${PATHS.top}"/>
    <path class="measure m-bottom" d="${PATHS.bottom}"/>
    <path class="measure m-loop" d="${PATHS.loop}"/>
    <path class="measure m-topdraw" d="${railsTop}"/>
    <path class="measure m-botdraw" d="${PATHS.bottomDraw}"/>
  `;

  const $ = (sel) => svg.querySelector(sel);
  const fx = $('.fx');
  const trolleyG = $('.trolley-g');
  const wheels = [...svg.querySelectorAll('.trolley-g .wheel')].map((w) => ({ el: w, base: w.getAttribute('transform') }));
  const leverArm = $('.lever-arm');
  const swArm = $('.sw-arm');
  const swHand = $('.sw-hand');
  const measure = { top: $('.m-top'), bottom: $('.m-bottom'), loop: $('.m-loop') };

  // ── ریل‌ها (دو خط موازی) و تراورس‌ها، با نمونه‌برداری از مسیر
  (function drawTrack() {
    const sample = (path, from, to, step) => {
      const pts = [];
      for (let s = from; s <= to + 0.01; s += step) {
        const a = path.getPointAtLength(Math.min(s, to));
        const b = path.getPointAtLength(Math.min(s + 1, path.getTotalLength()));
        const c = path.getPointAtLength(Math.max(s - 1, 0));
        const ang = Math.atan2(b.y - c.y, b.x - c.x);
        pts.push({ x: a.x, y: a.y, nx: -Math.sin(ang), ny: Math.cos(ang) });
      }
      return pts;
    };
    const offsetLine = (pts, d) => 'M ' + pts.map((q) => `${(q.x + q.nx * d).toFixed(1)} ${(q.y + q.ny * d).toFixed(1)}`).join(' L ');
    let rails = '';
    let ties = '';
    const addTrack = (path, from) => {
      const L = path.getTotalLength();
      const pts = sample(path, from, L, 4);
      rails += `<path class="rail" d="${offsetLine(pts, 5.5)}"/><path class="rail" d="${offsetLine(pts, -5.5)}"/>`;
      for (const q of sample(path, from + 8, L, 19)) {
        if (q.x < -30 || q.x > 930) continue;
        ties += `<line class="tie" x1="${(q.x - q.nx * 12).toFixed(1)}" y1="${(q.y - q.ny * 12).toFixed(1)}" x2="${(q.x + q.nx * 12).toFixed(1)}" y2="${(q.y + q.ny * 12).toFixed(1)}"/>`;
      }
    };
    addTrack($('.m-topdraw'), 0);
    addTrack($('.m-botdraw'), 0);
    $('.ties').innerHTML = ties;
    $('.rails').innerHTML = rails;
  })();

  // ── موقعیت آیتم‌ها روی مسیر (برای تشخیص برخورد)
  function sAtX(path, x) {
    let lo = 0;
    let hi = path.getTotalLength();
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).x > x) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  const itemEls = { top: [...svg.querySelectorAll('.items-top .item')], bottom: [...svg.querySelectorAll('.items-bottom .item')] };
  topItems.forEach((it, k) => { it.el = itemEls.top[k]; it.s = 960 - (it.x + it.art.w / 2); });
  bottomItems.forEach((it, k) => { it.el = itemEls.bottom[k]; it.s = sAtX(measure.bottom, it.x + it.art.w / 2); });

  // ── لایه‌ی متن‌ها (برچسب‌ها و یادداشت‌ها) روی SVG
  const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
  function overlayNode(cls, html, x, y) {
    const n = document.createElement('div');
    n.className = cls;
    n.innerHTML = html;
    n.style.left = pct(x, W);
    n.style.top = pct(y, H);
    overlay.append(n);
    return n;
  }
  function trackLabel(track, list, y, fallbackX) {
    if (!track.label) return;
    const xs = list.length ? list.map((it) => it.x) : [fallbackX];
    const hs = list.length ? list.map((it) => it.art.h) : [40];
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const tagged = list.some((it) => it.spec?.tag);
    const top = y - Math.max(...hs) - 12 - (tagged ? 30 : 0);
    if (isLoop && y === YT) overlayNode('track-label', track.label, 410, 80);
    else overlayNode('track-label', track.label, cx, top);
  }
  trackLabel(level.top, topItems, YT, 300);
  trackLabel(level.bottom, fogItem ? [fogItem] : bottomItems, YB, 196);
  for (const it of [...topItems, ...bottomItems]) {
    if (it.spec.tag) overlayNode('item-tag', it.spec.tag, it.x, (it.branch === 'top' ? YT : YB) - it.art.h - 6);
  }

  function note(text, x, y, cls = '') {
    const n = overlayNode(`scene-note ${cls}`, text, x, y);
    return n;
  }

  // ── اهرم و دست سوزن‌بان
  let leverAngle = LEVER_STAY;
  function setLever(a) {
    leverAngle = a;
    leverArm.setAttribute('transform', `translate(${PIVOT.x} 338) rotate(${a.toFixed(2)} 0 -7)`);
    const r = (a * Math.PI) / 180;
    const kx = PIVOT.x + 57 * Math.sin(r);
    const ky = PIVOT.y - 57 * Math.cos(r);
    const cx = (SHOULDER.x + kx) / 2 + 4;
    const cy = Math.max(SHOULDER.y, ky) + 16;
    swArm.setAttribute('d', `M ${SHOULDER.x} ${SHOULDER.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${(kx + 2).toFixed(1)} ${(ky + 4).toFixed(1)}`);
    swHand.setAttribute('cx', (kx + 2).toFixed(1));
    swHand.setAttribute('cy', (ky + 4).toFixed(1));
  }
  setLever(LEVER_STAY);

  function springLever(target) {
    return new Promise((resolve) => {
      let a = leverAngle;
      let v = 0;
      let last = performance.now();
      const step = (now) => {
        if (destroyed) return resolve();
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        const force = -260 * (a - target) - 13 * v;
        v += force * dt;
        a += v * dt;
        setLever(a);
        if (Math.abs(a - target) < 0.05 && Math.abs(v) < 0.5) {
          setLever(target);
          return resolve();
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async function jiggleLever() {
    for (const t of [LEVER_STAY + 9, LEVER_STAY - 2, LEVER_STAY + 7, LEVER_STAY]) {
      await springLever(t);
      sfx('rattle');
    }
  }

  // ── قطار
  let trolleyX = START_X + 260;
  function placeTrolley(x, y, angleDeg, s) {
    trolleyG.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angleDeg.toFixed(2)})`);
    const spin = ((s / 10) * 180) / Math.PI;
    for (const w of wheels) w.el.setAttribute('transform', `${w.base} rotate(${(-spin % 360).toFixed(1)})`);
  }

  function puff(x, y, big = false) {
    const g = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, A.smokePuff());
    fx.append(g);
    const c = g.firstChild;
    const anim = c.animate(
      [
        { transform: 'translate(0px,0px) scale(0.4)', opacity: 0.9 },
        { transform: `translate(${rand(10, 30)}px, ${rand(-36, -22)}px) scale(${big ? 2.2 : 1.5})`, opacity: 0 },
      ],
      { duration: big ? 1300 : 1000, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
    anim.onfinish = () => g.remove();
  }

  // ورود قطار به صحنه
  function enter() {
    if (reduceMotion()) {
      trolleyX = START_X;
      placeTrolley(START_X, YT, 0, 0);
      return;
    }
    const from = START_X + 260;
    const dur = 1500;
    const t0 = performance.now() + 250;
    sfx('bell');
    const step = (now) => {
      if (destroyed || running) return;
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - t, 3);
      trolleyX = from + (START_X - from) * e;
      placeTrolley(trolleyX, YT, 0, from - trolleyX);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // دود آرام در حالت انتظار
  let idleTimer = setInterval(() => {
    if (!running && !destroyed && document.visibilityState === 'visible') puff(trolleyX + 60, YT - 134);
  }, 900);

  // ── انیمیشن «طراحی با قلم»
  function sketchIn() {
    if (reduceMotion()) {
      stage.classList.add('drawn');
      return;
    }
    svg.classList.add('sketching');
    const shapes = svg.querySelectorAll('path:not(.measure), line, circle, ellipse, rect, text');
    for (const s of shapes) {
      if (s.tagName !== 'text') s.setAttribute('pathLength', '1');
      let x = 450;
      try {
        const b = s.getBBox();
        x = b.x + b.width / 2;
      } catch { /* ignore */ }
      const delay = ((W - x) / W) * 0.75 + rand(0, 0.18);
      s.style.setProperty('--d', `${delay.toFixed(3)}s`);
    }
    later(() => {
      svg.classList.remove('sketching');
      for (const s of shapes) s.removeAttribute('pathLength');
      stage.classList.add('drawn');
    }, 1900);
  }

  // ── پیش‌نمایش با هاور روی دکمه‌ها
  function preview(choice) {
    svg.classList.toggle('pv-pull', choice === 'pull');
    svg.classList.toggle('pv-stay', choice === 'stay');
  }

  // ── جلوه‌های برخورد
  function shake(power = 1) {
    if (reduceMotion()) return;
    const k = 4 * power;
    stage.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: `translate(${-k}px, ${k * 0.6}px)` },
        { transform: `translate(${k * 0.8}px, ${-k * 0.5}px)` },
        { transform: `translate(${-k * 0.4}px, ${k * 0.3}px)` },
        { transform: 'translate(0,0)' },
      ],
      { duration: 260, easing: 'ease-out' },
    );
  }

  function bubble(word, x, y, big = false) {
    const g = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, A.g(A.impactBubble(word), `rotate(${rand(-12, 12).toFixed(1)}) scale(${big ? 1.6 : 1})`));
    fx.append(g);
    const inner = g.firstChild;
    inner.style.transformBox = 'fill-box';
    inner.style.transformOrigin = 'center';
    const a = g.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 1 },
        { transform: `translate(${x}px, ${y - 6}px) scale(1.18)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${x}px, ${y - 8}px) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x}px, ${y - 14}px) scale(1)`, opacity: 1, offset: 0.8 },
        { transform: `translate(${x}px, ${y - 20}px) scale(0.9)`, opacity: 0 },
      ],
      { duration: 1300, easing: 'ease-out' },
    );
    g.removeAttribute('transform');
    a.onfinish = () => g.remove();
  }

  function burst(type, x, y, n = 10) {
    const parts = A.particles(type, n);
    for (const svgStr of parts) {
      const g = el('g', {}, svgStr);
      fx.append(g);
      const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const dist = rand(30, type === 'boom' ? 160 : 90);
      const dx = Math.cos(ang) * dist - rand(10, 40);
      const dy = Math.sin(ang) * dist;
      const a = g.animate(
        [
          { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${x + dx * 0.7}px, ${y + dy}px) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${x + dx}px, ${y + dy + 70}px) rotate(${rand(-400, 400)}deg)`, opacity: 0 },
        ],
        { duration: rand(700, 1100), easing: 'cubic-bezier(.2,.6,.4,1)' },
      );
      a.onfinish = () => g.remove();
    }
  }

  function pop(text, x, y) {
    const n = overlayNode('pop-text', text, x, y);
    later(() => n.remove(), 1500);
  }

  let bubbled = { top: false, bottom: false };
  function hitItem(it, mode, speed) {
    it.hit = true;
    const body = it.el.querySelector('.body');
    it.el.classList.add('is-hit');
    const y = it.branch === 'top' ? YT : YB;
    const cx = it.x;
    if (mode === 'bump') {
      it.el.classList.add('bumped');
      body.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'translate(-6px,-10px) rotate(-22deg)' },
          { transform: 'translate(-2px,0) rotate(9deg)' },
          { transform: 'rotate(-4deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 700, easing: 'ease-out', fill: 'forwards' },
      );
      burst('stars', cx, y - 50, 4);
      pop(level[it.branch].pop || 'آخ!', cx, y - it.art.h - 4);
      sfx('bump');
      return;
    }
    const sp = Math.min(2, Math.max(0.7, speed / 340));
    const dx = -rand(170, 290) * sp;
    const up = -rand(90, 160) * Math.min(1.4, sp);
    const rot = -rand(260, 620);
    body.animate(
      [
        { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${up}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${dx}px, 140px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: rand(1000, 1300), easing: 'cubic-bezier(.15,.55,.35,1)', fill: 'forwards' },
    );
    const kind = it.art.kind;
    if (!bubbled[it.branch] || kind !== 'human') {
      bubbled[it.branch] = true;
      bubble(pick(A.IMPACT_WORDS[kind] || A.IMPACT_WORDS.human), cx - 10, y - 92, kind === 'boom');
    }
    burst(it.art.burst || 'stars', cx, y - 30, it.art.burst ? 12 : 6);
    shake(kind === 'boom' ? 3 : 1);
    sfx(it.art.sfx || 'splat', { human: kind === 'human' });
  }

  function revealMystery(it) {
    it.revealed = true;
    const lid = it.el.querySelector('.lid');
    lid.style.transformBox = 'fill-box';
    lid.style.transformOrigin = 'center';
    lid.animate(
      [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(-10px,-46px) rotate(-40deg)', opacity: 0 }],
      { duration: 500, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    );
    const y = it.branch === 'top' ? YT : YB;
    const k = it.mystery;
    if (k > 0) {
      const body = it.el.querySelector('.body');
      const crowd = el('g', { class: 'popped' });
      const cols = Math.min(k, 5);
      for (let i = 0; i < k; i++) {
        const row = Math.floor(i / 5);
        const x = (i % 5 - (cols - 1) / 2) * 13;
        crowd.append(el('g', { transform: `translate(${x} ${-30 - row * 12}) scale(0.42)` }, A.human({ ...A.crowdLook(i + 1), mood: 'scared', tied: false })));
      }
      body.insertBefore(crowd, body.firstChild);
      crowd.animate([{ transform: 'translateY(26px)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'both' });
      it.humans = k;
      note(`${A.fa(k)} نفر داخلش بودند!`, it.x, y - 118, 'bad');
    } else {
      note('خالی بود! 🎉', it.x, y - 118, 'good');
    }
    sfx('pop');
  }

  let fogLifted = false;
  function liftFog(hypothetical = false) {
    if (fogLifted || !fogItem) return;
    fogLifted = true;
    const cloud = $('.fog-cloud');
    cloud.style.transformBox = 'fill-box';
    cloud.style.transformOrigin = 'center';
    cloud.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate(-60px,-20px) scale(1.25)' }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    for (const n of svg.querySelectorAll('.veiled')) n.classList.add('unveiled');
    const msg = fogCount === 0 ? 'کسی پشت مه نبود!' : `${A.fa(fogCount)} نفر پشت مه بودند!`;
    note(hypothetical ? `اگر کشیده بودید… ${msg}` : msg, fogItem.x, YB - 118, fogCount ? 'bad' : 'good');
    sfx('whoosh');
  }

  // ── اجرای تصمیم
  let running = false;
  async function run(choice) {
    running = true;
    cancelAnimationFrame(raf);
    clearInterval(idleTimer);
    preview(null);
    svg.classList.add('decided');
    let branch = choice === 'pull' ? 'bottom' : 'top';

    if (choice === 'pull') {
      sfx('lever');
      if (level.stuck) {
        await jiggleLever();
        const st = el('g', { class: 'stamp', transform: `translate(${PIVOT.x - 30} 230)` }, A.stamp('در دست بررسی'));
        fx.append(st);
        st.animate([{ transform: `translate(${PIVOT.x - 30}px,230px) scale(2.4)`, opacity: 0 }, { transform: `translate(${PIVOT.x - 30}px,230px) scale(1)`, opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
        st.removeAttribute('transform');
        later(() => { sfx('stamp'); shake(0.8); }, 240);
        await wait(700);
        branch = 'top';
      } else {
        await springLever(LEVER_PULL);
      }
    } else {
      // سوزن‌بان شانه بالا می‌اندازد
      $('.sw-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 380, easing: 'ease-in-out' });
      await wait(250);
    }
    svg.classList.add(`went-${branch}`);

    const track = level[branch];
    const items = (branch === 'top' ? topItems : bottomItems).slice().sort((a, b) => a.s - b.s);
    const special = branch === 'top' && isLoop;
    const path = special ? measure.loop : measure[branch];
    const L = path.getTotalLength();
    const mode = track.hit || 'fly';
    const factor = (track.speed || 1) * (reduceMotion() ? 1.8 : 1);
    let vmax = 360 * factor;
    let s = 960 - trolleyX;
    let v = 0;
    let last = performance.now();
    let puffAcc = 0;
    let clackAcc = 0;
    let exploded = false;
    let loopsDone = false;
    sfx('bell');
    sfx('rumble-start', { speed: factor });

    await new Promise((resolve) => {
      const step = (now) => {
        if (destroyed) return resolve();
        const dt = Math.min(0.04, (now - last) / 1000);
        last = now;
        v = Math.min(vmax, v + (vmax / 0.9) * dt);
        s += v * dt;

        const a = path.getPointAtLength(Math.min(s, L));
        const b = path.getPointAtLength(Math.min(s + 2, L));
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 180;
        if (!exploded) placeTrolley(a.x, a.y, s >= L ? 0 : ang, s);
        trolleyX = a.x;

        puffAcc += dt;
        if (puffAcc > 0.09 && !exploded) {
          puffAcc = 0;
          const r = (ang * Math.PI) / 180;
          puff(a.x + 60 * Math.cos(r) + 132 * Math.sin(r), a.y + 60 * Math.sin(r) - 132 * Math.cos(r));
        }
        clackAcc += v * dt;
        if (clackAcc > 76) {
          clackAcc = 0;
          sfx('clack');
        }

        for (const it of items) {
          if (it.mystery !== undefined && !it.revealed && s + FRONT + 150 >= it.s - it.art.w / 2) revealMystery(it);
          if (it.veiled && !fogLifted && s + FRONT + 230 >= it.s) liftFog();
          if (!it.hit && s + FRONT >= it.s - it.art.w / 2 + 4) {
            hitItem(it, mode, v);
            if (it.art.stops) {
              exploded = true;
              sfx('rumble-stop');
              const t = trolleyG.querySelector('.trolley-bob');
              t.style.transformBox = 'fill-box';
              t.style.transformOrigin = 'center';
              t.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25) rotate(-8deg)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
              burst('boom', a.x - 40, a.y - 50, 26);
              burst('stars', a.x, a.y - 60, 14);
              note('بـــوم! ۳ مسافر هم داخلش بودند…', a.x - 30, YB - 140, 'bad');
              later(resolve, 1200);
              return;
            }
          }
        }
        if (fogItem && branch === 'bottom' && !fogLifted && fogCount === 0 && s + FRONT + 230 >= sAtX(measure.bottom, fogItem.x)) liftFog();
        // در مرحله‌ی سرعت: بعد از آخرین برخورد، قطار به سرعت عادی برمی‌گردد
        if (items.length && items.every((it) => it.hit)) vmax = Math.max(vmax, 380);

        if (special && !loopsDone && s >= L - 1) {
          loopsDone = true;
          note('…و تا ابد می‌چرخد.', 250, 104, 'calm');
          return resolve(), keepLooping(s, L, path);
        }
        if (s >= L) {
          sfx('rumble-stop');
          return resolve();
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });

    if (fogItem && branch === 'top') liftFog(true);

    const effective = branch === 'bottom' ? 'pull' : 'stay';
    let deaths;
    if (level.deaths) deaths = level.deaths[effective];
    else deaths = items.reduce((t, it) => t + (it.hit ? it.humans : 0), 0);
    return { branch, effective, deaths };
  }

  // حلقه‌ی بی‌پایان: قطار پس از اتمام هم همچنان می‌چرخد
  function keepLooping(s0, L, path) {
    const loopLen = Math.PI * 140;
    let s = s0;
    let last = performance.now();
    const step = (now) => {
      if (destroyed) return;
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      s += 220 * dt;
      while (s > L) s -= loopLen;
      const a = path.getPointAtLength(s);
      const b = path.getPointAtLength(Math.min(s + 2, L));
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 180;
      placeTrolley(a.x, a.y, ang, s);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    clearInterval(idleTimer);
    for (const t of timers) clearTimeout(t);
    sfx('rumble-stop');
    stage.remove();
  }

  // شروع
  placeTrolley(trolleyX, YT, 0, 0);
  sketchIn();
  later(enter, reduceMotion() ? 0 : 500);

  return { el: stage, run, preview, destroy };
}

/** صحنه‌ی تزئینی برای صفحه‌ی شروع و لودر */
export function heroTrolley() {
  return A.trolley({ passengers: 0 });
}
