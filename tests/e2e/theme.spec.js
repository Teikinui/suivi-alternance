import { test, expect } from '@playwright/test';

const statuses = ['À postuler', 'Candidature envoyée', 'Entretien prévu', 'Offre reçue', 'Refusé'];

async function lightPalette(page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.getPropertyValue('--bg').trim(),
      accent: style.getPropertyValue('--accent').trim(),
      primary: getComputedStyle(document.querySelector('.primary')).backgroundColor,
      logo: getComputedStyle(document.querySelector('.brand-mark')).backgroundColor,
      chart: getComputedStyle(document.querySelector('.chart-line')).stroke,
      statuses: [...document.querySelectorAll('.distribution-row')].map((row) => getComputedStyle(row).getPropertyValue('--status-color').trim()),
    };
  });
}

async function contrastReport(page) {
  // Measure settled colors, not the intermediate values of the theme transition.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  return page.evaluate(() => {
    function luminance(color) {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    function background(element) {
      for (let node = element; node; node = node.parentElement) {
        const color = getComputedStyle(node).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
      }
      throw new Error('No opaque background found');
    }
    const checks = [];
    function check(label, foreground, backdrop, minimum) {
      const a = luminance(foreground), b = luminance(backdrop);
      checks.push({ label, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), minimum });
    }
    // Normal text, including the smaller labels, must meet WCAG AA (4.5:1).
    for (const selector of ['h1', '.muted', '.stat-top', '.stat-card p', '.chart-heading p', '.chart-tag', '.eyebrow', '.primary', '.brand-mark', '.position', '.card-detail', '.card-date', '.card-notes', '.card-status', '.card-actions button', '.reminder.due', '.offer-link', '.column-heading', '.column-count', '.footer', '.editor label', '.editor input', '.form-section legend', '.notes-count', '.error', '.action-center summary', '.action-company', '.action-count', '.action-help', '.action-contact', '.action-contact a', '.action-deadline', '.export-help', '.export-controls button', '.extra-subtitle', '.extra-badge', '.local-disclaimer', '.goal-numbers', '.goal-numbers small', '.goal-controller', '.goal-target-display', '.funnel-stage-label', '.funnel-stage-numbers', '.checklist-text', '.domain-name', '.domain-count-badge']) {
      document.querySelectorAll(selector).forEach((element, index) => {
        check(`${selector}[${index}]`, getComputedStyle(element).color, background(element), 4.5);
      });
    }
    document.querySelectorAll('.chart-label').forEach((element, index) => {
      check(`chart label ${index}`, getComputedStyle(element).fill, background(element), 4.5);
    });
    const line = document.querySelector('.chart-line');
    if (line) check('activity chart line', getComputedStyle(line).stroke, background(line), 3);
    document.querySelectorAll('.funnel-fill, .goal-progress-bar').forEach((element, index) => {
      check(`complementary chart bar ${index}`, getComputedStyle(element).backgroundColor, background(element.parentElement), 3);
    });
    document.querySelectorAll('.distribution-track > div').forEach((element, index) => {
      check(`status chart bar ${index}`, getComputedStyle(element).backgroundColor, background(element.parentElement), 3);
    });
    document.querySelectorAll('.status-dot').forEach((element, index) => {
      check(`status dot ${index}`, getComputedStyle(element).backgroundColor, background(element.parentElement), 3);
    });
    return checks;
  });
}

test('dark palette: readable text, charts and all statuses; light palette unchanged', async ({ page, request }, testInfo) => {
  for (const archived of [false, true]) {
    const rows = await (await request.get(`/api/applications?archived=${archived}`)).json();
    for (const row of rows) await request.delete(`/api/applications/${row.id}`);
  }
  for (let index = 0; index < statuses.length; index++) {
    await request.post('/api/applications', { data: {
      company: `Palette ${index}`, position: 'Test de lisibilité', status: statuses[index],
      appliedAt: new Date().toLocaleDateString('sv-SE'), followUpAt: '2000-01-01',
      notes: 'Notes et relance à vérifier', url: 'https://example.com', location: 'Paris',
    } });
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Palette 0', exact: true })).toBeVisible();
  const light = await lightPalette(page);
  expect(light).toEqual({
    background: '#f6f8f6', accent: '#277756', primary: 'rgb(39, 119, 86)',
    logo: 'rgb(39, 119, 86)', chart: 'rgb(39, 119, 86)',
    statuses: ['#8a96a5', '#638bc8', '#b78a44', '#429a72', '#c17c82'],
  });
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('html').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(17, 24, 39)');
  expect(await page.locator('.chart-line').evaluate((element) => getComputedStyle(element).stroke)).toBe('rgb(196, 181, 253)');
  await page.locator('.extras-disclosure > summary').click();
  const dashboard = await contrastReport(page);

  // Check the actual modal and a failed-save error in the dark theme too.
  await page.getByRole('button', { name: 'Nouvelle candidature', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Entreprise *', { exact: true }).fill('Contraste');
  await dialog.getByLabel('Poste *', { exact: true }).fill('Test');
  await page.route('**/api/applications', (route) => route.fulfill({ status: 400, json: { error: 'Erreur de test de contraste' } }));
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  const modal = await contrastReport(page);
  const report = [...dashboard, ...modal];
  await testInfo.attach('dark-contrast.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  for (const check of report) expect(check.ratio, `${check.label}: ${check.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(check.minimum);
  await page.screenshot({ path: testInfo.outputPath('dark-form-error.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Activer le mode clair' }).click();
  await expect.poll(() => lightPalette(page)).toEqual(light);
});
