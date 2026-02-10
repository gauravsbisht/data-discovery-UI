import { test, expect, type Page } from '@playwright/test';

// =========================================================
//  DataCerebrium E2E Tests
//  Requires:
//    1. Backend running: uvicorn app.main:app --port 8001
//    2. A local PostgreSQL with some tables (dpdp / dpdp DB is fine)
//  Run:  npx playwright test
// =========================================================

const DB_CREDS = {
  host: 'localhost',
  port: '5432',
  database: 'postgres',
  schema: 'redacted_db',
  user: 'dpdp',
  password: 'dpdp',
};

// ---------- helpers ----------

async function fillConnectionForm(page: Page, creds = DB_CREDS) {
  await page.getByTestId('input-host').fill(creds.host);
  await page.getByTestId('input-port').fill(creds.port);
  await page.getByTestId('input-database').fill(creds.database);
  await page.getByTestId('input-schema').fill(creds.schema);
  await page.getByTestId('input-user').fill(creds.user);
  await page.getByTestId('input-password').fill(creds.password);
}

// ==================== TESTS ====================

test.describe('Connection Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders connection form with default fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /DataCerebrium/ })).toBeVisible();
    await expect(page.getByTestId('input-host')).toHaveValue('localhost');
    await expect(page.getByTestId('input-port')).toHaveValue('5432');
    await expect(page.getByTestId('btn-test')).toBeVisible();
    await expect(page.getByTestId('btn-scan')).toBeDisabled();
  });

  test('Test Connection button is disabled without credentials', async ({ page }) => {
    // Clear the host to ensure button is disabled
    await page.getByTestId('input-host').fill('');
    await expect(page.getByTestId('btn-test')).toBeDisabled();
  });

  test('successful test connection enables Scan button', async ({ page }) => {
    await fillConnectionForm(page);
    await page.getByTestId('btn-test').click();

    // Wait for the success alert
    await expect(page.locator('.alert--success')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('btn-scan')).toBeEnabled();
  });

  test('bad credentials show error alert', async ({ page }) => {
    await fillConnectionForm(page, {
      ...DB_CREDS,
      user: 'no_such_user_xyz',
      password: 'wrong',
    });
    await page.getByTestId('btn-test').click();

    await expect(page.locator('.alert--error')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('btn-scan')).toBeDisabled();
  });
});

test.describe('Full Scan Flow', () => {
  test('runs scan and displays compliance report', async ({ page }) => {
    await page.goto('/');

    // 1. Fill creds & test
    await fillConnectionForm(page);
    await page.getByTestId('btn-test').click();
    await expect(page.locator('.alert--success')).toBeVisible({ timeout: 15_000 });

    // 2. Click Scan
    await page.getByTestId('btn-scan').click();

    // 3. Should see scanning state
    await expect(page.getByText('Scanning')).toBeVisible({ timeout: 5_000 });

    // 4. Wait for results
    await expect(page.getByTestId('stat-cards')).toBeVisible({ timeout: 120_000 });

    // 5. Verify stat cards
    await expect(page.getByTestId('score')).toBeVisible();
    const scoreText = await page.getByTestId('score').textContent();
    expect(scoreText).toMatch(/\d+%/);

    // 6. Verify findings displayed (grouped view is default)
    const findingsGrouped = page.getByTestId('findings-grouped');
    await expect(findingsGrouped).toBeVisible();
    // Should have at least one findings group
    const groups = findingsGrouped.locator('.findings-group');
    expect(await groups.count()).toBeGreaterThan(0);

    // 7. Verify download buttons exist
    await expect(page.getByTestId('btn-download-report')).toBeVisible();
    await expect(page.getByTestId('btn-download-script')).toBeVisible();

    // 8. Verify heatmap renders (if PII found)
    const heatmap = page.locator('.heatmap');
    if (await heatmap.isVisible()) {
      const foundCells = heatmap.locator('.heatmap__cell--found');
      expect(await foundCells.count()).toBeGreaterThan(0);
    }

    // 9. Click New Scan returns to form
    await page.getByTestId('btn-new-scan').click();
    await expect(page.getByTestId('input-host')).toBeVisible();
  });
});

test.describe('Report Downloads', () => {
  test('download links have correct URLs', async ({ page }) => {
    await page.goto('/');
    await fillConnectionForm(page);
    await page.getByTestId('btn-test').click();
    await expect(page.locator('.alert--success')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('btn-scan').click();
    await expect(page.getByTestId('stat-cards')).toBeVisible({ timeout: 120_000 });

    const reportHref = await page.getByTestId('btn-download-report').getAttribute('href');
    expect(reportHref).toMatch(/\/api\/v1\/scan\/.+\/report/);

    const scriptHref = await page.getByTestId('btn-download-script').getAttribute('href');
    expect(scriptHref).toMatch(/\/api\/v1\/scan\/.+\/script/);
  });
});
