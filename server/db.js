import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) {
    db.close();
    throw new Error(`Schéma SQLite v${version} plus récent que ce code (v1). Restaurez la version compatible.`);
  }
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      appliedAt TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('À postuler', 'Candidature envoyée', 'Entretien prévu', 'Offre reçue', 'Refusé')),
      salary TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      followUpAt TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1)),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    PRAGMA user_version = 1;
  `);
  return db;
}
