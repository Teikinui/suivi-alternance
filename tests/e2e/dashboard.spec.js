import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ timezoneId: 'America/Los_Angeles' });

async function download(page, name) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name, exact: true }).click(),
  ]);
  return { name: file.suggestedFilename(), text: await readFile(await file.path(), 'utf8') };
}

// Independent CSV reader for round-trip verification of quoted commas/newlines/quotes.
function parseCsv(text) {
  const rows = [], fields = [];
  let cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { fields.push(cell); cell = ''; }
    else if (character === '\r' && text[i + 1] === '\n' && !quoted) {
      fields.push(cell); rows.push([...fields]); fields.length = 0; cell = ''; i++;
    } else cell += character;
  }
  return rows;
}

let records;
test.beforeEach(async ({ request, page }) => {
  for (const archived of [false, true]) {
    for (const row of await (await request.get(`/api/applications?archived=${archived}`)).json()) await request.delete(`/api/applications/${row.id}`);
  }
  records = [];
  for (const item of [
    { company: 'Acme, "Paris"', position: 'Dev', status: 'Candidature envoyée', followUpAt: '2026-03-28', contact: 'rh@example.com', url: 'https://example.com/job', notes: 'Ligne 1\nLigne 2\r\nÉté' },
    { company: 'Ancienne', position: 'Designer', status: 'Entretien prévu', followUpAt: '2026-02-01', contact: '+33 6 12 34 56 78' },
    { company: 'Future', position: 'DevOps', status: 'À postuler', followUpAt: '2026-04-20' },
    { company: 'Archive', position: 'Lead', status: 'Offre reçue', followUpAt: '2026-01-01', notes: '=SUM(1,2)', archived: true },
  ]) records.push(await (await request.post('/api/applications', { data: item })).json());
  await page.clock.setFixedTime(new Date('2026-03-28T23:30:00-07:00'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Future', exact: true })).toBeVisible();
});

test('action center: keyboard collapse, due filters, contact links and persistent +2/+7 calendar reports', async ({ page, request }, testInfo) => {
  const center = page.locator('.action-center');
  await expect(center.getByRole('listitem')).toHaveCount(2);
  await expect(center.getByRole('link', { name: 'rh@example.com' })).toHaveAttribute('href', 'mailto:rh%40example.com');
  await expect(center.getByRole('link', { name: '+33 6 12 34 56 78' })).toHaveAttribute('href', 'tel:+33612345678');
  await expect(center.getByRole('link', { name: 'Voir l’offre de Acme, "Paris"' })).toHaveAttribute('rel', 'noopener noreferrer');
  const metric = page.locator('.stat-card').filter({ hasText: 'Accès aux entretiens' });
  await expect(metric.locator('strong')).toHaveText('50%');
  await center.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(center.getByRole('list')).not.toBeVisible();
  await page.keyboard.press('Enter');
  await expect(center.getByRole('list')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('action-center-light.png'), fullPage: true });
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.screenshot({ path: testInfo.outputPath('action-center-dark.png'), fullPage: true });

  await page.getByRole('button', { name: 'Relances à faire (2)' }).click();
  await expect(page.getByRole('heading', { name: 'Future', exact: true })).not.toBeVisible();
  await page.getByRole('searchbox').fill('Ancienne');
  await expect(page.getByRole('heading', { name: 'Acme, "Paris"', exact: true })).not.toBeVisible();
  await expect(center.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Effacer la recherche' }).click();
  await center.getByRole('button', { name: 'Reporter Acme, "Paris" de 2 jours à partir d’aujourd’hui' }).click();
  await expect(center.getByRole('listitem')).toHaveCount(1);
  await expect(center.locator('summary')).toBeFocused();
  await page.reload();
  await expect(center.getByRole('listitem')).toHaveCount(1);
  let data = await (await request.get('/api/applications')).json();
  expect(data.find((row) => row.id === records[0].id).followUpAt).toBe('2026-03-30');

  await page.route(`**/api/applications/${records[1].id}`, (route) => route.fulfill({ status: 500, json: { error: 'Échec du report' } }));
  const postpone = center.getByRole('button', { name: 'Reporter Ancienne de 7 jours à partir d’aujourd’hui' });
  await postpone.click();
  await expect(page.getByRole('alert')).toContainText('Échec du report');
  await expect(center.getByRole('listitem')).toHaveCount(1);
  await page.unroute(`**/api/applications/${records[1].id}`);
  await postpone.click();
  await expect(center.getByText('Aucune relance à traiter. Vous êtes à jour !')).toBeVisible();
  data = await (await request.get('/api/applications')).json();
  expect(data.find((row) => row.id === records[1].id).followUpAt).toBe('2026-04-04');
  await page.getByRole('button', { name: 'Archives', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Archive', exact: true })).toBeVisible();
  await expect(center).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Relances à faire/ })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('real JSON/CSV downloads preserve scope, escape CSV correctly and neutralize formulas', async ({ page }) => {
  await page.getByRole('button', { name: 'Relances à faire (2)' }).click();
  await page.getByRole('searchbox').fill('Ancienne');
  let file = await download(page, 'Exporter JSON');
  expect(file.name).toContain('actives-filtered-');
  let document = JSON.parse(file.text);
  expect(document.applications.map((row) => row.id)).toEqual([records[1].id]);
  expect(document.scope.filters.dueOnly).toBe(true);
  await page.getByLabel('Périmètre de l’export').selectOption('tab');
  file = await download(page, 'Exporter CSV');
  const csv = parseCsv(file.text);
  const headers = csv.shift();
  const rows = csv.map((fields) => Object.fromEntries(headers.map((key, index) => [key, fields[index]])));
  expect(rows).toHaveLength(3);
  expect(rows.find((row) => Number(row.id) === records[0].id).company).toBe('Acme, "Paris"');
  expect(rows.find((row) => Number(row.id) === records[0].id).notes).toBe('Ligne 1\nLigne 2\r\nÉté');
  expect(rows.every((row) => row.archived === 'false')).toBe(true);
  await page.getByRole('button', { name: 'Effacer la recherche' }).click();
  await page.getByRole('button', { name: 'Archives', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Archive', exact: true })).toBeVisible();
  file = await download(page, 'Exporter JSON');
  document = JSON.parse(file.text);
  expect(file.name).toContain('archives-tab-');
  expect(document.scope.archived).toBe(true);
  expect(document.applications.map((row) => row.id)).toEqual([records[3].id]);
  expect(document.applications[0].notes).toBe('=SUM(1,2)');
  const archivedCsv = parseCsv((await download(page, 'Exporter CSV')).text);
  expect(archivedCsv).toHaveLength(2);
  expect(archivedCsv[1][archivedCsv[0].indexOf('notes')]).toBe("'=SUM(1,2)");
});

test('integrated complementary panels preserve browser preferences and archive-scoped metrics', async ({ page, request }, testInfo) => {
  for (const index of [0, 1, 3]) await request.patch(`/api/applications/${records[index].id}`, { data: { appliedAt: '2026-03-28' } });
  await page.evaluate(() => localStorage.setItem('candidatures_weekly_goal', '1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Future', exact: true })).toBeVisible();
  const disclosure = page.locator('.extras-disclosure > summary');
  await disclosure.focus();
  await page.keyboard.press('Enter');
  const extras = page.getByRole('region', { name: 'Indicateurs complémentaires et préparation' });
  const progress = extras.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '1');
  await expect(progress).toHaveAttribute('aria-valuetext', '2 sur 1 candidature');
  await extras.getByRole('button', { name: "Augmenter l'objectif d'une candidature" }).click();
  await expect(progress).toHaveAttribute('aria-valuetext', '2 sur 2 candidatures');
  const checklist = extras.getByRole('checkbox', { name: 'Relire l’offre et identifier les compétences clés' });
  await checklist.check();
  await expect(extras.getByText('example.com', { exact: true })).toBeVisible();
  await page.reload();
  await expect(disclosure).toBeVisible();
  await disclosure.click();
  await expect(checklist).toBeChecked();
  await expect(progress).toHaveAttribute('aria-valuemax', '2');
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.screenshot({ path: testInfo.outputPath('dashboard-extras-dark.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Archives', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Archive', exact: true })).toBeVisible();
  await page.locator('.extras-disclosure > summary').click();
  await expect(progress).toHaveAttribute('aria-valuetext', '1 sur 2 candidatures');
  const funnel = extras.locator('.funnel-list');
  await expect(funnel).toHaveAttribute('aria-label', /Candidatures envoyées : 1.*Entretiens prévus ou offres : 1.*Offres reçues : 1/);
  await expect(checklist).toBeChecked();
  await extras.getByRole('button', { name: 'Tout réinitialiser' }).click();
  await expect(checklist).not.toBeChecked();
});
