import { test, expect } from '@playwright/test';

const longCompany = 'Entreprise au nom très long — ' + 'Horizon '.repeat(14);

test.beforeEach(async ({ request }) => {
  for (const archived of [false, true]) {
    for (const row of await (await request.get(`/api/applications?archived=${archived}`)).json()) await request.delete(`/api/applications/${row.id}`);
  }
  for (const company of [longCompany, 'Opportunité courte']) {
    await request.post('/api/applications', { data: {
      company, position: 'Développeur full-stack — accessibilité et outils de suivi',
      status: 'Candidature envoyée', followUpAt: '2000-01-01', appliedAt: '2026-03-25',
      location: 'Télétravail · Une localisation suffisamment longue pour tester le retour à la ligne',
      contact: 'contact-' + 'long'.repeat(30) + '@example.com',
      url: 'https://example.com/job', notes: 'Note de démonstration. ' + 'unechainecontinue'.repeat(40),
    } });
  }
});

test('design polish reflows long content and readable charts at 320, 390, 768 and 1440px', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Opportunité courte', exact: true })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect.poll(() => page.locator('.activity-chart').evaluate((element) => Math.abs(element.viewBox.baseVal.width - element.getBoundingClientRect().width))).toBeLessThan(2);
    const sizes = await page.locator('.chart-label').evaluateAll((labels) => labels.map((element) => element.getBoundingClientRect().height));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11.5);
    await page.locator('.extras-disclosure > summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`polish-${width}-light.png`), fullPage: true });
    await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
    await page.screenshot({ path: testInfo.outputPath(`polish-${width}-dark.png`), fullPage: true });
    await page.getByRole('button', { name: 'Activer le mode clair' }).click();
  }
});

test('keyboard skip link, scrollable table and mobile form remain fully operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Opportunité courte', exact: true })).toBeAttached();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Aller au suivi des candidatures' });
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox()).y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Suivi des candidatures', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Vue Tableau' }).click();
  const tableRegion = page.getByRole('region', { name: 'Tableau défilant des candidatures' });
  await tableRegion.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Opportunité courte', exact: true }) });
  await row.getByRole('button', { name: 'Modifier', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const controls = await dialog.locator('.form-grid input, .form-grid select, .form-grid textarea').evaluateAll((elements) => elements.map((element) => ({ font: parseFloat(getComputedStyle(element).fontSize), height: element.getBoundingClientRect().height })));
  expect(controls.every((item) => item.font >= 16 && item.height >= 44)).toBeTruthy();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('touch-sized controls and reduced motion preserve the same actions', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Opportunité courte', exact: true })).toBeAttached();
  const activate = (locator) => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await activate(page.getByRole('button', { name: 'Nouvelle candidature', exact: true }));
  await expect(page.getByRole('dialog')).toBeVisible();
  await activate(page.getByRole('button', { name: 'Annuler', exact: true }));
  await activate(page.getByRole('button', { name: 'Activer le mode sombre' }));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await activate(page.locator('.extras-disclosure > summary'));
  const goal = page.getByRole('button', { name: "Augmenter l'objectif d'une candidature" });
  await activate(goal);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '6');
  const fieldSizes = await page.locator('input:not([type="checkbox"]), select, textarea').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length > 0).map((element) => parseFloat(getComputedStyle(element).fontSize)));
  expect(fieldSizes.every((size) => size >= 16)).toBeTruthy();
  const targetSizes = await page.locator('button, .offer-link, .workspace-link').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length > 0).map((element) => ({ name: element.getAttribute('aria-label') || element.textContent, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  for (const target of targetSizes) {
    expect(target.width, `${target.name} width`).toBeGreaterThanOrEqual(43.5);
    expect(target.height, `${target.name} height`).toBeGreaterThanOrEqual(43.5);
  }
  const card = page.getByRole('heading', { name: 'Opportunité courte', exact: true }).locator('..');
  await activate(card.getByRole('button', { name: 'Archiver', exact: true }));
  await expect(page.getByRole('status')).toContainText('Candidature mise à jour.');
  await expect(page.locator('.toast-notification')).toHaveCSS('animation-name', 'none');
});
