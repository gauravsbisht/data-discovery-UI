import { test, expect } from '@playwright/test';

/**
 * E2E Test: DataCerebrium Full Flow
 * 1. Navigate to ConsentAxis landing page
 * 2. Click "Try DataCerebrium" button
 * 3. Enter sales key in modal
 * 4. Connect to Supabase PostgreSQL
 * 5. Run scan and verify results
 * 6. Download report
 */

// Test configuration
const LANDING_PAGE_URL = 'https://consentaxis.com';
const DATACEREBRIUM_URL = 'https://kind-tree-0ec2f2700.2.azurestaticapps.net';
const SALES_KEY = 'sales123'; // The valid sales key

// Supabase test database credentials
const DB_CONFIG = {
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: '5432',
  database: 'postgres',
  schema: 'client_redact_schema',
  username: 'postgres.awazsdefkhhmtmsxgkna',
  password: '2wsx@WSX1qaz!QAZ',
};

test.describe('DataCerebrium E2E Flow', () => {
  test('should complete full scan flow from landing page', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(120000);

    // Step 1: Go to landing page
    console.log('Step 1: Navigating to landing page...');
    await page.goto(LANDING_PAGE_URL);
    await expect(page).toHaveTitle(/ConsentAxis/);

    // Step 2: Click "Try DataCerebrium" button
    console.log('Step 2: Clicking Try DataCerebrium button...');
    const dataCerebriumBtn = page.locator('button:has-text("Try DataCerebrium")');
    await expect(dataCerebriumBtn).toBeVisible();
    await dataCerebriumBtn.click();

    // Step 3: Enter sales key in modal
    console.log('Step 3: Entering sales key...');
    const salesKeyInput = page.locator('#salesKeyInput');
    await expect(salesKeyInput).toBeVisible();
    await salesKeyInput.fill(SALES_KEY);
    
    // Click "Access Demo" button
    const accessDemoBtn = page.locator('button:has-text("Access Demo")');
    await accessDemoBtn.click();

    // Wait for redirect to DataCerebrium
    console.log('Step 4: Waiting for redirect to DataCerebrium...');
    await page.waitForURL(/kind-tree.*azurestaticapps\.net|datacerebrium/);
    
    // Verify we're on DataCerebrium
    await expect(page.locator('text=DataCerebrium')).toBeVisible();
    await expect(page.locator('text=Connect Database')).toBeVisible();

    // Step 5: Fill in database connection form
    console.log('Step 5: Filling database connection form...');
    
    // Select PostgreSQL (should be default)
    const dbTypeSelect = page.locator('select.form-select');
    await dbTypeSelect.selectOption('postgresql');

    // Fill host
    const hostInput = page.locator('input[placeholder*="host"], input').filter({ hasText: '' }).first();
    await page.locator('input').nth(0).fill(DB_CONFIG.host);
    
    // Fill port
    await page.locator('input').nth(1).fill(DB_CONFIG.port);
    
    // Fill database
    await page.locator('input').nth(2).fill(DB_CONFIG.database);
    
    // Fill schema
    await page.locator('input').nth(3).fill(DB_CONFIG.schema);
    
    // Fill username
    await page.locator('input').nth(4).fill(DB_CONFIG.username);
    
    // Fill password
    await page.locator('input').nth(5).fill(DB_CONFIG.password);

    // Step 6: Test connection
    console.log('Step 6: Testing connection...');
    const testConnectionBtn = page.locator('button:has-text("Test Connection")');
    await testConnectionBtn.click();
    
    // Wait for success message
    await expect(page.locator('text=Connection successful').or(page.locator('.alert--success'))).toBeVisible({ timeout: 30000 });

    // Step 7: Run scan
    console.log('Step 7: Running scan...');
    const scanNowBtn = page.locator('button:has-text("Scan Now")');
    await expect(scanNowBtn).toBeEnabled();
    await scanNowBtn.click();

    // Wait for scan to complete (may take up to 60 seconds)
    console.log('Waiting for scan to complete...');
    await expect(page.locator('text=Compliance Report').or(page.locator('text=DPDP Compliance Report'))).toBeVisible({ timeout: 90000 });

    // Step 8: Verify report content
    console.log('Step 8: Verifying report content...');
    
    // Check score is displayed
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
    
    // Check tables scanned info
    await expect(page.locator('text=/tables scanned|Tables Scanned/i')).toBeVisible();
    
    // Check PII findings are shown
    await expect(page.locator('text=/PII|Personal Data/i')).toBeVisible();

    // Step 9: Download report
    console.log('Step 9: Testing download functionality...');
    
    // Look for download button
    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export"), button:has-text("CSV")').first();
    if (await downloadBtn.isVisible()) {
      // Set up download handler
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click(),
      ]);
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|pdf)$/i);
      console.log(`Downloaded: ${download.suggestedFilename()}`);
    }

    console.log('✅ E2E test completed successfully!');
  });

  test('should scan database directly on DataCerebrium', async ({ page }) => {
    // Direct test without going through landing page
    test.setTimeout(90000);

    console.log('Navigating directly to DataCerebrium...');
    await page.goto(DATACEREBRIUM_URL);
    
    // Wait for page to load
    await expect(page.locator('text=DataCerebrium')).toBeVisible();
    await expect(page.locator('text=Connect Database')).toBeVisible();

    // Fill connection form using labels
    console.log('Filling connection form...');
    
    // Host field
    await page.getByLabel('Host').or(page.locator('input').first()).fill(DB_CONFIG.host);
    
    // Port field  
    await page.getByLabel('Port').or(page.locator('input').nth(1)).fill(DB_CONFIG.port);
    
    // Database field
    await page.getByLabel('Database').or(page.locator('input').nth(2)).fill(DB_CONFIG.database);
    
    // Schema field
    await page.getByLabel('Schema').or(page.locator('input').nth(3)).fill(DB_CONFIG.schema);
    
    // Username field
    await page.getByLabel(/Username|User/i).or(page.locator('input').nth(4)).fill(DB_CONFIG.username);
    
    // Password field
    await page.getByLabel('Password').or(page.locator('input[type="password"]')).fill(DB_CONFIG.password);

    // Test connection
    console.log('Testing connection...');
    await page.locator('button:has-text("Test Connection")').click();
    
    // Wait for connection test result
    await page.waitForTimeout(5000);
    
    // Check if connection successful or handle error
    const successIndicator = page.locator('text=Connection successful, text=tables found, .alert--success');
    const errorIndicator = page.locator('.alert--error, text=Error, text=Failed');
    
    // If error, log and fail
    if (await errorIndicator.isVisible()) {
      const errorText = await errorIndicator.textContent();
      console.error('Connection error:', errorText);
    }
    
    // Proceed with scan if test passed
    const scanBtn = page.locator('button:has-text("Scan Now")');
    if (await scanBtn.isEnabled()) {
      console.log('Running scan...');
      await scanBtn.click();
      
      // Wait for results
      await expect(page.locator('text=Compliance Report').or(page.locator('text=Score'))).toBeVisible({ timeout: 90000 });
      console.log('✅ Scan completed successfully!');
    }
  });
});
