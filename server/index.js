import { openDatabase } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const db = openDatabase(process.env.DB_PATH || './data/applications.sqlite');
const server = createApp(db).listen(port, '0.0.0.0', () => {
  console.log(`Candidatures disponible sur http://localhost:${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => { db.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
