// لایه‌ی ذخیره‌سازی رأی‌ها با SQLite داخلی Node (بدون وابستگی خارجی)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CHOICES = ['pull', 'stay'];

export function openStore(path) {
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
  `);

  const q = {
    existing: db.prepare('SELECT choice FROM votes WHERE session = ? AND level = ?'),
    insertVote: db.prepare('INSERT INTO votes (session, level, choice, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'),
    updateVote: db.prepare('UPDATE votes SET choice = ?, updated_at = ? WHERE session = ? AND level = ?'),
    bump: db.prepare(`INSERT INTO tallies (level, choice, n) VALUES (?, ?, ?)
                      ON CONFLICT (level, choice) DO UPDATE SET n = MAX(0, n + excluded.n)`),
    addSession: db.prepare('INSERT OR IGNORE INTO sessions (session, created_at) VALUES (?, ?)'),
    levelTally: db.prepare('SELECT choice, n FROM tallies WHERE level = ?'),
    allTallies: db.prepare('SELECT level, choice, n FROM tallies'),
    players: db.prepare('SELECT COUNT(*) AS n FROM sessions'),
  };

  function levelStats(level) {
    const out = { pull: 0, stay: 0 };
    for (const row of q.levelTally.all(level)) out[row.choice] = row.n;
    return out;
  }

  // ثبت یا تغییر رأی؛ هر نشست برای هر مرحله فقط یک رأی دارد
  function castVote(session, level, choice) {
    const now = Date.now();
    db.exec('BEGIN IMMEDIATE');
    try {
      q.addSession.run(session, now);
      const prev = q.existing.get(session, level);
      if (!prev) {
        q.insertVote.run(session, level, choice, now, now);
        q.bump.run(level, choice, 1);
      } else if (prev.choice !== choice) {
        q.updateVote.run(choice, now, session, level);
        q.bump.run(level, prev.choice, -1);
        q.bump.run(level, choice, 1);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
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

  return { castVote, levelStats, allStats, close: () => db.close() };
}
