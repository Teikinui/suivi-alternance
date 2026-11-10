import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EMPTY_APPLICATION, STATUSES } from '../shared/domain.js';

const fields = Object.keys(EMPTY_APPLICATION);
const limits = { company: 160, position: 160, url: 2048, location: 200, salary: 120, contact: 300, notes: 10000 };
const serialize = (row) => ({ ...row, archived: Boolean(row.archived) });

function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Objet JSON attendu.';
  if (Object.keys(body).some((key) => ![...fields, 'archived'].includes(key))) return 'Champ inconnu.';
  if (!partial && (!['company', 'position'].every((key) => typeof body[key] === 'string' && body[key].trim()))) return 'Entreprise et poste obligatoires.';
  for (const [key, value] of Object.entries(body)) {
    if (key === 'archived') {
      if (typeof value !== 'boolean') return 'Le champ archived doit être un booléen.';
      continue;
    }
    if (typeof value !== 'string') return `Le champ ${key} doit être du texte.`;
    if (['company', 'position'].includes(key) && !value.trim()) return 'Entreprise et poste obligatoires.';
    if (value.length > (limits[key] || 50)) return `Le champ ${key} est trop long.`;
    if (key === 'status' && !STATUSES.includes(value)) return 'Statut invalide.';
    if (['appliedAt', 'followUpAt'].includes(key) && value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return 'Date invalide (AAAA-MM-JJ attendu).';
    }
    if (key === 'url' && value) {
      try {
        if (!['https:', 'http:'].includes(new URL(value).protocol)) return 'Le lien doit utiliser HTTP ou HTTPS.';
      } catch { return 'Lien invalide.'; }
    }
  }
  return null;
}

export function createApp(db, { staticDir = resolve('dist') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    // Reject cross-origin browser writes. This local single-user app has no public CORS API.
    const origin = req.get('origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin) {
      try {
        if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origine non autorisée.' });
      } catch { return res.status(403).json({ error: 'Origine invalide.' }); }
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });
  app.get('/api/applications', (req, res) => {
    const archived = req.query.archived === 'true' ? 1 : 0;
    const rows = db.prepare('SELECT * FROM applications WHERE archived = ? ORDER BY id DESC').all(archived);
    res.set('Cache-Control', 'no-store').json(rows.map(serialize));
  });
  app.post('/api/applications', (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });
    const record = { ...EMPTY_APPLICATION, ...req.body };
    const now = new Date().toISOString();
    const values = fields.map((key) => record[key].trim());
    const result = db.prepare(`INSERT INTO applications (${fields.join(',')}, archived, createdAt, updatedAt) VALUES (${fields.map(() => '?').join(',')}, ?, ?, ?)`)
      .run(...values, record.archived ? 1 : 0, now, now);
    res.status(201).json(serialize(db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(result.lastInsertRowid))));
  });
  app.param('id', (req, res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({ error: 'Identifiant invalide.' });
    req.application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(id));
    if (!req.application) return res.status(404).json({ error: 'Candidature introuvable.' });
    next();
  });
  app.patch('/api/applications/:id', (req, res) => {
    const error = validate(req.body, true);
    if (error) return res.status(400).json({ error });
    const record = { ...req.application, ...req.body };
    db.prepare(`UPDATE applications SET ${fields.map((key) => `${key} = ?`).join(',')}, archived = ?, updatedAt = ? WHERE id = ?`)
      .run(...fields.map((key) => record[key].trim()), record.archived ? 1 : 0, new Date().toISOString(), Number(req.params.id));
    res.json(serialize(db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(req.params.id))));
  });
  app.delete('/api/applications/:id', (req, res) => {
    db.prepare('DELETE FROM applications WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  if (existsSync(resolve(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse.' });
    console.error(error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });
  return app;
}
