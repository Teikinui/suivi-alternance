import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/db.js';

const directory = mkdtempSync(join(tmpdir(), 'candidatures-e2e-'));
const db = openDatabase(join(directory, 'applications.sqlite'));
const server = createApp(db).listen(3100, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  }));
}
