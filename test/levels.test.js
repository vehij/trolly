import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, DEFAULT_LABELS, MIN_VOTES, hasChoice } from '../public/js/levels.js';
import { ITEMS } from '../public/js/art.js';

const PERSIAN_DIACRITICS = /[ً-ْ]/;

test('۳۵ مرحله در سه پرده، با شناسه‌های یکتا و تمیز', () => {
  assert.equal(LEVELS.length, 35);
  const ids = new Set();
  for (const l of LEVELS) {
    assert.match(l.id, /^[a-z][a-z-]*$/, `شناسه‌ی نامعتبر: ${l.id}`);
    assert.ok(!ids.has(l.id), `شناسه‌ی تکراری: ${l.id}`);
    ids.add(l.id);
    assert.ok(l.title && l.text, l.id);
    assert.ok([1, 2, 3].includes(l.act), `پرده‌ی نامعتبر در ${l.id}`);
  }
  // پرده‌ها پشت سر هم‌اند: ۸ مرحله، ۱۹ مرحله، ۸ مرحله
  assert.deepEqual([1, 2, 3].map((a) => LEVELS.filter((l) => l.act === a).length), [8, 19, 8]);
  assert.deepEqual(LEVELS.map((l) => l.act), [...LEVELS.map((l) => l.act)].sort());
  assert.equal(LEVELS[0].id, 'original');
  assert.equal(LEVELS.at(-1).id, 'previous-player');
});

test('هر آیتم در art.js تعریف شده و تصویر معتبر می‌دهد', () => {
  for (const l of LEVELS) {
    for (const track of [l.top, l.bottom]) {
      assert.ok(Array.isArray(track.items), l.id);
      for (const item of track.items) {
        assert.ok(ITEMS[item.k], `آیتم ناشناخته ${item.k} در ${l.id}`);
        const art = ITEMS[item.k](item, 0, 0);
        assert.equal(typeof art.svg, 'string', item.k);
        assert.ok(art.w > 0 && art.h > 0, item.k);
        assert.ok(Number.isInteger(art.humans), item.k);
      }
    }
  }
});

test('برچسب دکمه‌ها و ریل‌ها کامل‌اند و اعراب یا خط تیره‌ی بلند ندارند', () => {
  for (const l of LEVELS) {
    const labels = { ...DEFAULT_LABELS, ...l.labels };
    assert.ok(labels.pull, l.id);
    if (hasChoice(l)) assert.ok(labels.stay, l.id);
    const texts = [l.title, l.text, labels.pull, labels.stay, l.top.label, l.bottom.label, l.top.note, l.bottom.note, l.top.pop, l.bottom.pop,
      ...[...l.top.items, ...l.bottom.items].map((i) => i.tag)].filter(Boolean);
    for (const t of texts) {
      assert.doesNotMatch(t, PERSIAN_DIACRITICS, `اعراب در ${l.id}: ${t}`);
      assert.ok(!t.includes('—'), `خط تیره‌ی بلند در ${l.id}: ${t}`);
    }
  }
});

test('مرحله‌های ویژه درست تعریف شده‌اند', () => {
  const by = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
  // پل عابر: بدون اهرم، دو دکمه‌ی خودش، مرد کوله‌به‌دوش روی ریل دوم
  assert.equal(by.footbridge.mode, 'push');
  assert.deepEqual(by.footbridge.labels, { pull: 'هلش بده', stay: 'دستم به او نمی‌خورد' });
  assert.deepEqual(by.footbridge.bottom.items.map((i) => i.k), ['backpacker']);
  // بی‌خطرها
  for (const id of ['prank', 'cars']) assert.deepEqual(by[id].deaths, { stay: 0, pull: 0 }, id);
  assert.deepEqual(by.gas.deaths, { stay: 5, pull: 5 });
  assert.equal(by.gas.mode, 'gas');
  assert.deepEqual(by.smoke.deaths, { stay: 5, pull: 0 });
  assert.ok(by.smoke.top.note && by.smoke.bottom.items.some((i) => i.k === 'wall'));
  assert.ok(by.cars.top.note && by.cars.bottom.note);
  // همکار: ریل اهرم خالی است
  assert.equal(by.coworker.bottom.items.length, 0);
  // قرعه: شش جا
  assert.ok(by.lottery.lottery);
  const seats = [...by.lottery.top.items, ...by.lottery.bottom.items].reduce((t, i) => t + (i.n || 1), 0);
  assert.equal(seats, 6);
  // بازیکن قبلی: فقط یک دکمه، رأی نمی‌گیرد، بازیکن روی ریل اهرم است
  const last = by['previous-player'];
  assert.equal(hasChoice(last), false);
  assert.equal(last.labels.pull, 'ببینیم');
  assert.equal(last.labels.stay, undefined);
  assert.ok(by[last.basedOn], 'مرحله‌ی مبنای احتمال باید وجود داشته باشد');
  assert.ok(last.bottom.items.some((i) => i.k === 'you'));
  assert.equal(LEVELS.filter((l) => !hasChoice(l)).length, 1);
  assert.equal(MIN_VOTES, 30);
});

test('چهار مرحله‌ی بازنویسی‌شده: جای درست، بدون مرگ انسان در ریل اهرم', () => {
  const ids = LEVELS.map((l) => l.id);
  for (const old of ['tea', 'savings', 'motorbike', 'tahdig']) assert.ok(!ids.includes(old), `شناسه‌ی قدیمی ${old} هنوز هست`);
  assert.equal(ids[2], 'gallery');
  assert.equal(ids[4], 'house');
  assert.equal(ids[5], 'rider');
  assert.equal(ids[13], 'no-tahdig');
  const humansOn = (track) => track.items.reduce((t, i) => t + ITEMS[i.k](i, 0, 0).humans * (i.n || 1), 0);
  for (const id of ['gallery', 'house', 'no-tahdig']) {
    const l = LEVELS.find((x) => x.id === id);
    assert.equal(humansOn(l.top), 1, id);
    assert.equal(humansOn(l.bottom), 0, id);
    assert.equal(l.deaths, undefined, id);
    assert.ok(l.bottom.note && l.bottom.label, id);
  }
  // موتوری: عابر قانونی بالا (بدون دست زدن)، موتورسوار پایین (با کشیدن اهرم)
  const rider = LEVELS.find((x) => x.id === 'rider');
  assert.deepEqual(rider.top.items.map((i) => i.k), ['pedestrian']);
  assert.deepEqual(rider.bottom.items.map((i) => i.k), ['rider']);
});
