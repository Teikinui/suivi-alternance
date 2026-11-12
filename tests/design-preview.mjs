// Local design tooling only: synthetic records in memory, never ./data.
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/db.js';
import { EMPTY_APPLICATION, STATUSES } from '../shared/domain.js';
import { mkdirSync, writeFileSync } from 'node:fs';

const db = openDatabase(':memory:');
const columns = Object.keys(EMPTY_APPLICATION);
const statement = db.prepare(`INSERT INTO applications (${columns.join(',')}, archived, createdAt, updatedAt) VALUES (${columns.map(() => '?').join(',')}, 0, ?, ?)`);
for (const [index, company] of ['Studio Horizon', 'Maison Nova', 'Atelier Pixel', 'Bloom Tech', 'Collectif Alto', 'Lumen'].entries()) {
  const date = new Date();
  date.setDate(date.getDate() - index * 5);
  const record = { ...EMPTY_APPLICATION, company, position: ['Développeur full-stack', 'Designer produit', 'Ingénieur DevOps'][index % 3], status: STATUSES[index % 5], location: 'Paris · Hybride', salary: '42–48 k€', appliedAt: date.toLocaleDateString('sv-SE'), followUpAt: date.toLocaleDateString('sv-SE'), notes: 'Une opportunité fictive pour vérifier le rendu.', contact: 'Contact de démonstration', url: 'https://example.com/job' };
  const now = new Date().toISOString();
  statement.run(...columns.map((key) => record[key]), now, now);
}
const port = Number(process.env.DESIGN_PREVIEW_PORT || 3102);
const server = createApp(db).listen(port, '127.0.0.1', () => {
  mkdirSync('.impeccable/review', { recursive: true });
  writeFileSync('.impeccable/review/preview.json', JSON.stringify({ pid: process.pid, port }));
  console.log(`Design preview: http://127.0.0.1:${port} — données fictives en mémoire, PID ${process.pid}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
