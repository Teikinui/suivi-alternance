import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const cases = [
  { file: 'schema.html', url: 'https://careers.example.test/page', company: 'Atelier & Horizon', position: 'Ingénieur·e logiciel', salary: '45000–52000 EUR / year' },
  { file: 'linkedin.html', url: 'https://www.linkedin.com/jobs/search/?currentJobId=123&trackingId=test', company: 'DataFlow Systems', position: 'Ingénieur Cloud DevOps', salary: '45–55 k€' },
  { file: 'generic.html', url: 'https://jobs.example.test/page', company: 'Studio Nova', position: 'Designer produit', salary: '' },
];

test.beforeEach(async ({ request }) => {
  for (const archived of [false, true]) {
    const rows = await (await request.get(`/api/applications?archived=${archived}`)).json();
    for (const row of rows) await request.delete(`/api/applications/${row.id}`);
  }
});

for (const fixture of cases) {
  test(`production bookmarklet on local ${fixture.file} fixture opens a reviewed draft, never submits to the source`, async ({ page, context, request }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Importer une offre : installer le bookmarklet' }).click();
    const guide = page.getByRole('dialog', { name: 'Installer le bookmarklet' });
    const favorite = guide.getByRole('link', { name: 'Suivre l’offre' });
    await expect(favorite).toHaveAttribute('href', /^javascript:/);
    const code = await favorite.getAttribute('href');
    // Entire external origin is fulfilled locally: no LinkedIn/third-party request occurs.
    const html = await readFile(new URL(`../fixtures/jobs/${fixture.file}`, import.meta.url), 'utf8');
    await context.route(new URL(fixture.url).origin + '/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    const source = await context.newPage();
    const writes = [];
    source.on('request', (request) => { if (request.method() !== 'GET') writes.push(request.url()); });
    const alerts = [];
    source.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.dismiss(); });
    await source.goto(fixture.url);
    await source.evaluate((href) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'Capturer cette offre (test)';
      document.body.append(link);
    }, code);
    const opened = context.waitForEvent('page');
    await source.getByRole('link', { name: 'Capturer cette offre (test)' }).click();
    const imported = await opened;
    await imported.waitForLoadState('domcontentloaded');
    const form = imported.getByRole('dialog', { name: 'Nouvelle candidature' });
    await expect(form).toBeVisible();
    await expect(form.getByText('Brouillon importé — rien n’est encore enregistré.')).toBeVisible();
    await expect(form.getByLabel('Entreprise *', { exact: true })).toHaveValue(fixture.company);
    await expect(form.getByLabel('Poste *', { exact: true })).toHaveValue(fixture.position);
    await expect(form.getByLabel('Salaire', { exact: true })).toHaveValue(fixture.salary);
    await expect(form.getByRole('combobox', { name: 'Statut', exact: true })).toHaveValue('À postuler');
    expect(await imported.evaluate(() => window.opener)).toBeNull();
    expect(await imported.evaluate(() => document.referrer)).toBe('');
    expect(new URL(imported.url()).hash).toBe('');
    expect(new URL(imported.url()).search).toBe('');
    expect((await (await request.get('/api/applications')).json())).toHaveLength(0);
    expect(source.url()).toBe(fixture.url);
    expect(writes).toEqual([]);
    expect(alerts).toEqual([]);
    if (fixture.file === 'linkedin.html') await expect(form.getByLabel('Lien de l’offre')).toHaveValue('https://www.linkedin.com/jobs/view/123/');
    await imported.screenshot({ path: testInfo.outputPath(`draft-${fixture.file}.png`), fullPage: true });
    await form.getByLabel('Entreprise *', { exact: true }).fill(fixture.company + ' vérifiée');
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(form).not.toBeVisible();
    const rows = await (await request.get('/api/applications')).json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ company: fixture.company + ' vérifiée', status: 'À postuler', archived: false });
    expect(writes).toEqual([]);
  });
}

test('partial drafts, cancellation and malicious payloads never auto-save or execute HTML', async ({ page, request }) => {
  const encode = (offer) => '#job-import=' + encodeURIComponent(JSON.stringify({ version: 1, source: 'web', offer }));
  await page.goto('/' + encode({ url: 'https://example.com/job?id=42', notes: '<img src=x onerror="window.importExecuted=true">' }));
  const form = page.getByRole('dialog', { name: 'Nouvelle candidature' });
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  expect(await form.getByLabel('Entreprise *', { exact: true }).evaluate((element) => element.validity.valueMissing)).toBe(true);
  expect(await page.evaluate(() => window.importExecuted)).toBeUndefined();
  await expect(page.locator('img')).toHaveCount(0);
  await form.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.reload();
  await expect(form).not.toBeVisible();
  for (const fragment of [encode({ company: 'A', url: 'javascript:alert(1)' }), '#job-import=%ZZ']) {
    await page.goto('/' + fragment);
    await expect(page.getByRole('alert')).toContainText('Import refusé');
    await expect(form).not.toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
  }
  expect((await (await request.get('/api/applications')).json())).toHaveLength(0);
});

test('bookmarklet installation guide supports manual selection, invalid targets and mobile layout', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Importer une offre : installer le bookmarklet' }).click();
  const guide = page.getByRole('dialog', { name: 'Installer le bookmarklet' });
  await guide.getByText('Installation manuelle et code', { exact: true }).click();
  const code = guide.getByLabel('Code du bookmarklet', { exact: true });
  await expect(code).toHaveAttribute('readonly', '');
  await guide.getByRole('button', { name: 'Sélectionner le code' }).click();
  await expect(code).toBeFocused();
  expect(await code.evaluate((element) => element.selectionEnd - element.selectionStart)).toBeGreaterThan(1000);
  const origin = guide.getByLabel('Adresse de votre application', { exact: true });
  await origin.fill('https://tracker.example.test/path');
  await expect(guide.getByRole('alert')).toContainText('sans chemin');
  await expect(guide.getByRole('button', { name: 'Copier le code' })).toBeDisabled();
  await origin.fill(new URL(page.url()).origin);
  await expect(guide.getByRole('link', { name: 'Suivre l’offre' })).toHaveAttribute('href', /^javascript:/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('bookmarklet-guide.png'), fullPage: true });
  await guide.getByRole('button', { name: 'Terminer' }).click();
  await expect(guide).not.toBeVisible();
});
