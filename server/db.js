// لایه‌ی ذخیره‌سازی رأی‌ها با SQLite داخلی Node (بدون وابستگی خارجی)
//
// همگام‌سازی بین دو نسخه (ایران / بین‌الملل):
// - هر رأی با (session, level) یکتاست و session در مرورگر به صورت UUID ساخته می‌شود،
//   پس رأی‌های دو سرور تقریباً هیچ‌وقت با هم تداخل ندارند.
// - هر تغییر محلی یک شماره‌ی ترتیبی (seq) می‌گیرد؛ طرف مقابل با «تغییرات بعد از seq فلان»
//   از جایی که مانده ادامه می‌دهد، حتی بعد از ماه‌ها قطعی.
// - در تداخل، رأی جدیدتر برنده است (updated_at و در تساوی، origin) تا هر دو طرف به یک نتیجه برسند.
// - آمار مرحله‌هایی که رأی راه‌دور گرفته‌اند از روی خود رأی‌ها دوباره شمرده می‌شود (نه جمع زدن).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CHOICES = ['pull', 'stay'];

export function openStore(path, { region = 'main' } = {}) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS votes (
      session    TEXT    NOT NULL,
      level      TEXT    NOT NULL,
      choice     TEXT    NOT NULL CHECK (choice IN ('pull', 'stay')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (session, level)
    );
    CREATE TABLE IF NOT EXISTS tallies (
      level  TEXT    NOT NULL,
      choice TEXT    NOT NULL,
      n      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (level, choice)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      session    TEXT    PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT    PRIMARY KEY,
      n    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_state (
      peer         TEXT    PRIMARY KEY,
      pulled       INTEGER NOT NULL DEFAULT 0,
      pushed       INTEGER NOT NULL DEFAULT 0,
      last_attempt INTEGER,
      last_ok      INTEGER,
      last_error   TEXT
    );
  `);

  // مهاجرت: دیتابیس‌های قدیمی ستون‌های همگام‌سازی را ندارند
  const cols = db.prepare('PRAGMA table_info(votes)').all().map((c) => c.name);
  if (!cols.includes('origin')) db.exec("ALTER TABLE votes ADD COLUMN origin TEXT NOT NULL DEFAULT ''");
  if (!cols.includes('seq')) db.exec('ALTER TABLE votes ADD COLUMN seq INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE INDEX IF NOT EXISTS votes_seq ON votes (seq)');
  db.prepare("UPDATE votes SET origin = ? WHERE origin = ''").run(region);
  db.exec(`
    INSERT OR IGNORE INTO counters (name, n) VALUES ('seq', 0);
    UPDATE votes SET seq = rowid + (SELECT n FROM counters WHERE name = 'seq') WHERE seq = 0;
    UPDATE counters SET n = MAX(n, (SELECT COALESCE(MAX(seq), 0) FROM votes)) WHERE name = 'seq';
  `);

  const q = {
    nextSeq: db.prepare("UPDATE counters SET n = n + 1 WHERE name = 'seq' RETURNING n"),
    headSeq: db.prepare("SELECT n FROM counters WHERE name = 'seq'"),
    existing: db.prepare('SELECT choice, updated_at, origin FROM votes WHERE session = ? AND level = ?'),
    insertVote: db.prepare('INSERT INTO votes (session, level, choice, created_at, updated_at, origin, seq) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    updateVote: db.prepare('UPDATE votes SET choice = ?, updated_at = ?, origin = ?, seq = ? WHERE session = ? AND level = ?'),
    bump: db.prepare(`INSERT INTO tallies (level, choice, n) VALUES (?, ?, ?)
                      ON CONFLICT (level, choice) DO UPDATE SET n = MAX(0, n + excluded.n)`),
    clearTally: db.prepare('DELETE FROM tallies WHERE level = ?'),
    recount: db.prepare('INSERT INTO tallies (level, choice, n) SELECT level, choice, COUNT(*) FROM votes WHERE level = ? GROUP BY choice'),
    addSession: db.prepare('INSERT OR IGNORE INTO sessions (session, created_at) VALUES (?, ?)'),
    levelTally: db.prepare('SELECT choice, n FROM tallies WHERE level = ?'),
    allTallies: db.prepare('SELECT level, choice, n FROM tallies'),
    players: db.prepare('SELECT COUNT(*) AS n FROM sessions'),
    voteCount: db.prepare('SELECT COUNT(*) AS n FROM votes'),
    changes: db.prepare('SELECT session, level, choice, created_at, updated_at, origin, seq FROM votes WHERE seq > ? ORDER BY seq LIMIT ?'),
    getSync: db.prepare('SELECT * FROM sync_state WHERE peer = ?'),
    allSync: db.prepare('SELECT * FROM sync_state'),
    initSync: db.prepare('INSERT OR IGNORE INTO sync_state (peer) VALUES (?)'),
  };

  const nextSeq = () => q.nextSeq.get().n;

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function levelStats(level) {
    const out = { pull: 0, stay: 0 };
    for (const row of q.levelTally.all(level)) out[row.choice] = row.n;
    return out;
  }

  // ثبت یا تغییر رأی؛ هر نشست برای هر مرحله فقط یک رأی دارد
  function castVote(session, level, choice) {
    const now = Date.now();
    tx(() => {
      q.addSession.run(session, now);
      const prev = q.existing.get(session, level);
      if (!prev) {
        q.insertVote.run(session, level, choice, now, now, region, nextSeq());
        q.bump.run(level, choice, 1);
      } else if (prev.choice !== choice) {
        q.updateVote.run(choice, Math.max(now, prev.updated_at + 1), region, nextSeq(), session, level);
        q.bump.run(level, prev.choice, -1);
        q.bump.run(level, choice, 1);
      }
    });
    return levelStats(level);
  }

  function allStats() {
    const levels = {};
    for (const { level, choice, n } of q.allTallies.all()) {
      levels[level] ??= { pull: 0, stay: 0 };
      levels[level][choice] = n;
    }
    return { levels, players: q.players.get().n };
  }

  /**
   * تغییرات بعد از یک seq. ردیف‌هایی که مبدأشان excludeOrigin است برگردانده نمی‌شوند
   * (طرف مقابل خودش آن‌ها را دارد)، ولی نشانگر (last) از رویشان رد می‌شود.
   */
  function changesSince(after, { limit = 1000, excludeOrigin = null } = {}) {
    const scanned = q.changes.all(after, limit);
    const last = scanned.length ? scanned[scanned.length - 1].seq : after;
    const rows = scanned
      .filter((r) => r.origin !== excludeOrigin)
      .map(({ seq, ...r }) => r);
    return { rows, last, more: scanned.length === limit, head: q.headSeq.get().n };
  }

  const wins = (incoming, current) =>
    incoming.updated_at > current.updated_at ||
    (incoming.updated_at === current.updated_at && incoming.origin > current.origin);

  /** اعمال رأی‌های رسیده از سرور دیگر (خودتوان: اعمال دوباره‌ی همان ردیف‌ها تأثیری ندارد) */
  function applyRemote(rows) {
    let applied = 0;
    let skipped = 0;
    const touched = new Set();
    tx(() => {
      for (const r of rows) {
        q.addSession.run(r.session, r.created_at);
        const cur = q.existing.get(r.session, r.level);
        if (!cur) {
          q.insertVote.run(r.session, r.level, r.choice, r.created_at, r.updated_at, r.origin, nextSeq());
        } else if (wins(r, cur)) {
          q.updateVote.run(r.choice, r.updated_at, r.origin, nextSeq(), r.session, r.level);
        } else {
          skipped += 1;
          continue;
        }
        applied += 1;
        touched.add(r.level);
      }
      for (const level of touched) {
        q.clearTally.run(level);
        q.recount.run(level);
      }
    });
    return { applied, skipped };
  }

  function getSyncState(peer) {
    q.initSync.run(peer);
    return q.getSync.get(peer);
  }

  function setSyncState(peer, patch) {
    q.initSync.run(peer);
    const keys = Object.keys(patch).filter((k) => ['pulled', 'pushed', 'last_attempt', 'last_ok', 'last_error'].includes(k));
    if (!keys.length) return;
    db.prepare(`UPDATE sync_state SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE peer = ?`).run(...keys.map((k) => patch[k]), peer);
  }

  function status() {
    return {
      region,
      head: q.headSeq.get().n,
      votes: q.voteCount.get().n,
      players: q.players.get().n,
      peers: q.allSync.all(),
    };
  }

  return { region, castVote, levelStats, allStats, changesSince, applyRemote, getSyncState, setSyncState, status, close: () => db.close() };
}
