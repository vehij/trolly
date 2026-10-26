import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as A from '../public/js/art.js';

test('صحنه‌ی صفحه‌ی اول: سوزن‌بان و اهرم کنار ریل‌اند، نه رویش', () => {
  const svg = A.heroScene('<g id="trolley"/>');
  const tf = (cls) => {
    const m = svg.match(new RegExp(`<g transform="translate\\(([\\d.]+) ([\\d.]+)\\)[^"]*"><g class="${cls}">`));
    return m && { x: +m[1], y: +m[2] };
  };
  const sw = tf('hero-sw');
  assert.ok(sw, 'سوزن‌بان پیدا نشد');
  // پایین چرخ‌های قطار روی HERO_RAIL_Y است و ریل پایینی ۶ واحد پایین‌تر؛ تراورس‌ها تا ۱۲ واحد.
  // بالای سر سوزن‌بان (حدود ۷۵ واحد × مقیاس ۱٫۱۵) و دسته‌ی اهرم باید زیر تراورس‌ها بمانند.
  assert.ok(sw.y - 75 * 1.15 > A.HERO_RAIL_Y + 12, 'سر سوزن‌بان به ریل رسیده');
  const lever = svg.match(/<g transform="translate\(([\d.]+) ([\d.]+)\)"><rect/);
  assert.ok(lever, 'اهرم پیدا نشد');
  assert.ok(+lever[2] - 71 > A.HERO_RAIL_Y + 12, 'دسته‌ی اهرم به ریل رسیده');
  // قطار ثابت تصویرهای اشتراک جلوتر از سوزن‌بان پارک می‌شود
  assert.ok(A.HERO_TROLLEY_PARK - 80 > sw.x + 20);
});

test('تعداد مرحله‌ها هیچ‌جا دستی نوشته نشده', async () => {
  for (const f of ['public/index.html', 'public/js/app.js', 'public/js/share.js', 'server/meta.js', 'README.md']) {
    const src = await readFile(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /[0-9۰-۹]+\s*دوراهی/, `عدد ثابت کنار «دوراهی» در ${f}`);
  }
});
