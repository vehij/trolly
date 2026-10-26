// به‌روزرسانی فهرست بازه‌های IP ایران (از داده‌ی رسمی RIRها، از طریق پروژه‌ی ipverse/rir-ip)
// اجرا: npm run update-geo  — خروجی در server/geo/ ذخیره می‌شود و باید commit شود
// (سرور ایران در زمان قطعی نمی‌تواند آن را دانلود کند، پس فایل همراه کد منتشر می‌شود).
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'geo');
const SRC = 'https://raw.githubusercontent.com/ipverse/rir-ip/master/country/ir';

for (const v of ['ipv4', 'ipv6']) {
  const res = await fetch(`${SRC}/${v}-aggregated.txt`);
  if (!res.ok) throw new Error(`${v}: HTTP ${res.status}`);
  const lines = (await res.text()).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (lines.length < 50) throw new Error(`${v}: فهرست مشکوک به ناقص بودن است (${lines.length} خط)`);
  await writeFile(join(OUT, `ir-${v}.txt`), `# Iran ${v} ranges — source: github.com/ipverse/rir-ip — ${new Date().toISOString().slice(0, 10)}\n${lines.join('\n')}\n`);
  console.log(`${v}: ${lines.length} بازه`);
}
