import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db.js';
import { createApp } from '../server/app.js';

let db, app;
beforeEach(() => { db = openDatabase(':memory:'); app = createApp(db, { staticDir: 'nonexistent-test-dist' }); });
afterEach(() => db.close());
const example = { company: 'Horizon', position: 'Développeuse', status: 'Candidature envoyée', appliedAt: '2026-03-20', followUpAt: '2026-03-27', url: 'https://example.com/job', location: 'Lyon · Télétravail', salary: '45 k€', contact: 'RH', notes: 'Premier échange' };

test('health checks the database and security headers are set', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
});

test('full CRUD, archive isolation, restore and all fields', async () => {
  const created = await request(app).post('/api/applications').send(example).expect(201);
  const item = created.body;
  for (const [key, value] of Object.entries(example)) assert.equal(item[key], value);
  assert.equal(item.archived, false);
  assert.ok(item.createdAt);
  assert.equal((await request(app).get('/api/applications')).body.length, 1);
  const updated = await request(app).patch(`/api/applications/${item.id}`).send({ status: 'Entretien prévu', notes: 'Préparer entretien' }).expect(200);
  assert.equal(updated.body.status, 'Entretien prévu');
  assert.equal(updated.body.company, example.company);
  await request(app).patch(`/api/applications/${item.id}`).send({ archived: true }).expect(200);
  assert.deepEqual((await request(app).get('/api/applications')).body, []);
  assert.equal((await request(app).get('/api/applications?archived=true')).body[0].archived, true);
  await request(app).patch(`/api/applications/${item.id}`).send({ archived: false }).expect(200);
  assert.equal((await request(app).get('/api/applications')).body.length, 1);
  await request(app).delete(`/api/applications/${item.id}`).expect(204);
  await request(app).patch(`/api/applications/${item.id}`).send({ notes: 'x' }).expect(404);
  assert.deepEqual((await request(app).get('/api/applications')).body, []);
});

test('minimal creation applies defaults and trims values', async () => {
  const response = await request(app).post('/api/applications').send({ company: ' A ', position: ' B ' }).expect(201);
  assert.equal(response.body.company, 'A');
  assert.equal(response.body.status, 'À postuler');
  assert.equal(response.body.notes, '');
});

for (const [label, body] of [
  ['missing company', { position: 'Dev' }],
  ['blank company', { ...example, company: '   ' }],
  ['wrong text type', { ...example, notes: 34 }],
  ['wrong status', { ...example, status: 'inconnu' }],
  ['impossible date', { ...example, appliedAt: '2026-02-30' }],
  ['wrong date format', { ...example, followUpAt: '01/02/2026' }],
  ['unsafe URL', { ...example, url: 'javascript:alert(1)' }],
  ['malformed URL', { ...example, url: 'not-a-url' }],
  ['long notes', { ...example, notes: 'a'.repeat(10001) }],
  ['unknown field', { ...example, id: 999 }],
  ['wrong archived type', { ...example, archived: 'true' }],
  ['array payload', []],
  ['null company', { ...example, company: null }],
]) {
  test(`validation rejects ${label}`, async () => {
    const response = await request(app).post('/api/applications').send(body).expect(400);
    assert.equal(typeof response.body.error, 'string');
    assert.equal((await request(app).get('/api/applications')).body.length, 0);
  });
}

test('PATCH validates fields too and does not corrupt stored data', async () => {
  const { body } = await request(app).post('/api/applications').send(example);
  await request(app).patch(`/api/applications/${body.id}`).send({ company: '' }).expect(400);
  await request(app).patch(`/api/applications/${body.id}`).send({ status: 'BAD' }).expect(400);
  assert.equal((await request(app).get('/api/applications')).body[0].company, example.company);
});

test('bad identifiers, unknown routes, malformed JSON and large requests', async () => {
  await request(app).delete('/api/applications/abc').expect(400);
  await request(app).delete('/api/applications/999').expect(404);
  await request(app).get('/api/unknown').expect(404);
  await request(app).post('/api/applications').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/api/applications').send({ ...example, notes: 'x'.repeat(40000) }).expect(413);
});

test('cross-origin browser writes are rejected', async () => {
  await request(app).post('/api/applications').set('Origin', 'https://evil.example').send(example).expect(403);
});

test('SQL and HTML are stored as data without execution', async () => {
  const payload = { company: "'); DROP TABLE applications; --", position: '<script>alert(1)</script>' };
  const { body } = await request(app).post('/api/applications').send(payload).expect(201);
  assert.equal(body.company, payload.company);
  assert.equal((await request(app).get('/api/applications')).body[0].position, payload.position);
});

test('a newer database schema is refused without downgrading it', () => {
  const directory = mkdtempSync(join(tmpdir(), 'candidatures-version-'));
  const path = join(directory, 'app.sqlite');
  const newer = openDatabase(path);
  newer.exec('PRAGMA user_version = 2');
  newer.close();
  try {
    assert.throws(() => openDatabase(path), /plus récent/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('SQLite data persists after closing and reopening the file', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'candidatures-test-'));
  const path = join(directory, 'nested', 'app.sqlite');
  const first = openDatabase(path);
  try {
    await request(createApp(first)).post('/api/applications').send(example).expect(201);
  } finally { first.close(); }
  const second = openDatabase(path);
  try {
    const response = await request(createApp(second)).get('/api/applications').expect(200);
    assert.equal(response.body[0].company, example.company);
    assert.equal(response.body[0].followUpAt, example.followUpAt);
  } finally { second.close(); rmSync(directory, { recursive: true, force: true }); }
});
