// پشتیبان‌گیری امن از دیتابیس در حال کار (بدون نیاز به sqlite3)
// اجرا: npm run backup  — خروجی: data/backups/votes-YYYY-MM-DD.db (۱۴ نسخه‌ی آخر نگه داشته می‌شود)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadConfig } from '../server/config.js';

const { dbPath } = loadConfig();
if (!existsSync(dbPath)) {
  console.error(`دیتابیس پیدا نشد: ${dbPath}`);
  process.exit(1);
}
const dir = join(dirname(dbPath), 'backups');
mkdirSync(dir, { recursive: true });
const out = join(dir, `votes-${new Date().toISOString().slice(0, 10)}.db`);
rmSync(out, { force: true });
const db = new DatabaseSync(dbPath);
db.prepare('VACUUM INTO ?').run(out);
db.close();
const old = readdirSync(dir).filter((f) => /^votes-.*\.db$/.test(f)).sort().slice(0, -14);
for (const f of old) rmSync(join(dir, f));
console.log(`پشتیبان ساخته شد: ${out}`);
