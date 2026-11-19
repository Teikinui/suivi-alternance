import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const statuses = ['À postuler', 'Candidature envoyée', 'Entretien prévu', 'Offre reçue', 'Refusé'];

for (const systemTheme of ['light', 'dark']) {
  test(`status controls keep their theme at rest and on hover (system ${systemTheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: systemTheme });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.route('**/api/applications?*', (route) => route.fulfill({ json: statuses.map((status, index) => ({
      id: index + 1, company: `Statut ${index}`, position: 'Vérification fictive', status, archived: false,
      appliedAt: '', followUpAt: '', notes: '', location: '', salary: '', url: '',
    })) }));
    await page.goto('/');
    await expect(page.locator('.card-status')).toHaveCount(5);
    const report = [];
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
      for (const view of ['Kanban', 'Tableau']) {
        await page.getByRole('button', { name: `Vue ${view}`, exact: true }).click();
        for (let index = 0; index < statuses.length; index++) {
          const control = page.locator(`.card-status.status-${index}`);
          await page.mouse.move(0, 0);
          const rest = await control.evaluate((element) => {
            const style = getComputedStyle(element);
            return { color: style.color, background: style.backgroundColor, scheme: style.colorScheme };
          });
          await control.hover();
          const hover = await control.evaluate((element) => {
            const style = getComputedStyle(element);
            const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
              const c = value / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
            const a = luminance(style.color), b = luminance(style.backgroundColor);
            return { color: style.color, background: style.backgroundColor, scheme: style.colorScheme,
              contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
          });
          report.push({ theme, view, status: statuses[index], rest, hover });
          if (index === 3 && view === 'Kanban') {
            await control.screenshot({ path: testInfo.outputPath(`${theme}-offer-hover.png`) });
            await page.mouse.move(0, 0);
            await control.screenshot({ path: testInfo.outputPath(`${theme}-offer-rest.png`) });
          }
        }
      }
    }
    const reportPath = testInfo.outputPath('status-states.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    await testInfo.attach('status-states.json', { path: reportPath, contentType: 'application/json' });
    for (const { theme, view, status, rest, hover } of report) {
      const label = `${theme}/${view}/${status}`;
      expect(hover.color, label).toBe(rest.color);
      expect(hover.background, label).toBe(rest.background);
      expect(hover.contrast, label).toBeGreaterThanOrEqual(4.5);
      // Native select painting must follow the app, not the OS/meta color-scheme.
      expect(rest.scheme, label).toBe(theme);
      expect(hover.scheme, label).toBe(theme);
    }
  });
}
