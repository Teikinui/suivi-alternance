import { test, expect } from '@playwright/test';

const statuses = ['À postuler', 'Candidature envoyée', 'Entretien prévu', 'Offre reçue', 'Refusé'];

test.beforeEach(async ({ request }) => {
  for (const archived of [false, true]) {
    const rows = await (await request.get(`/api/applications?archived=${archived}`)).json();
    for (const row of rows) await request.delete(`/api/applications/${row.id}`);
  }
});

test('real browser: full lifecycle, reload persistence, filters and archives', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouvelle candidature', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Entreprise *', { exact: true }).fill('Mon entreprise');
  await dialog.getByLabel('Poste *', { exact: true }).fill('Full-stack');
  await dialog.getByLabel('Lien de l’offre').fill('https://example.com/job');
  await dialog.getByLabel('Lieu / télétravail').fill('Lyon · Hybride');
  await dialog.getByLabel('Salaire').fill('45–50 k€');
  await dialog.getByLabel('Contact').fill('Camille RH');
  await dialog.getByLabel('Notes').fill('Préparer les questions');
  await dialog.getByLabel('Date de candidature').fill('2026-03-20');
  await dialog.getByLabel('Prochaine relance').fill('2026-03-27');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mon entreprise' })).toBeVisible();
  await expect(page.getByText('Préparer les questions')).toBeVisible();
  await page.getByLabel('Statut de Mon entreprise — Full-stack').selectOption('Entretien prévu');
  await expect(page.getByLabel('Statut de Mon entreprise — Full-stack')).toHaveValue('Entretien prévu');
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByLabel('Notes').fill('Entretien confirmé');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Entretien confirmé')).toBeVisible();
  await page.getByRole('button', { name: /Tableau/ }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('searchbox').fill('absent');
  await expect(page.getByText(/Aucune candidature ne correspond/)).toBeVisible();
  await page.getByRole('button', { name: 'Réinitialiser' }).click();
  await page.getByRole('button', { name: 'Archiver', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mon entreprise', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Archives', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mon entreprise', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurer' }).click();
  await expect(page.getByRole('button', { name: 'Mon entreprise', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Mes candidatures' }).click();
  await expect(page.getByRole('button', { name: 'Mon entreprise', exact: true })).toBeVisible();
  page.once('dialog', (confirmation) => confirmation.accept());
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mon entreprise', exact: true })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('visual rendering: populated dashboard, charts, dark theme and responsive layout', async ({ page, request }, testInfo) => {
  const now = new Date();
  const companies = ['Studio Horizon', 'Maison Nova', 'Atelier Pixel', 'Bloom Tech', 'Collectif Alto', 'Lumen'];
  for (let i = 0; i < companies.length; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 5);
    await request.post('/api/applications', { data: {
      company: companies[i], position: ['Développeur full-stack', 'Designer produit', 'Ingénieur DevOps'][i % 3],
      status: statuses[i % 5], appliedAt: date.toLocaleDateString('sv-SE'),
      location: i % 2 ? 'Paris · Hybride' : 'Télétravail', salary: '42–48 k€',
      followUpAt: date.toLocaleDateString('sv-SE'), url: 'https://example.com', notes: 'Une belle opportunité à explorer.',
    } });
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Studio Horizon' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Candidatures par semaine', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /À postuler :/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('dashboard-light.png'), fullPage: true });
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Studio Horizon' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
});
