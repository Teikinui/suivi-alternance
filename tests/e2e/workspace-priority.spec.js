import { test, expect } from '@playwright/test';

// Layout checks use synthetic data supplied by the isolated E2E server.
test('the application workspace precedes analysis and reminder panels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Chargement de vos candidatures…')).toHaveCount(0);
  const workspace = page.locator('#candidatures');
  await expect(workspace).toBeVisible();
  const order = await workspace.evaluate((element) => {
    const panels = document.querySelectorAll('.action-center, .charts-grid, .extras-disclosure');
    return [...panels].every((panel) => Boolean(element.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order).toBe(true);
  await page.getByRole('link', { name: 'Accéder au suivi', exact: false }).click();
  await expect(workspace).toBeFocused();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});
