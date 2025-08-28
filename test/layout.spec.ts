import { test, expect } from '@playwright/test';

test.describe('Layout Spacing and Consistency', () => {
  test('header to first card gap should be minimal at 1440px viewport', async ({ page }) => {
    // Set viewport to 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('.grid');
    
    // Get header bottom position
    const header = await page.locator('header').first();
    const headerRect = await header.boundingBox();
    const headerBottom = headerRect!.y + headerRect!.height;
    
    // Get first card top position
    const firstCard = await page.locator('.grid > *:first-child').first();
    const cardRect = await firstCard.boundingBox();
    const cardTop = cardRect!.y;
    
    // Calculate gap
    const gap = cardTop - headerBottom;
    
    // Assert gap is minimal (should be very small now)
    expect(gap).toBeLessThanOrEqual(20);
    
    console.log(`Header to first card gap: ${gap}px`);
  });

  test('header should have proper structure', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('header');
    
    // Verify header has the basic structure
    const header = page.locator('header').first();
    
    // Check for essential header classes
    await expect(header).toHaveClass(/sticky/);
    await expect(header).toHaveClass(/top-0/);
    await expect(header).toHaveClass(/z-40/);
    
    // Verify the header content is visible
    const headerContent = header.locator('div.mx-auto.max-w-screen-2xl');
    await expect(headerContent).toBeVisible();
  });

  test('no corner elements should be visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    
    // Check for any fixed/absolute positioned elements in corners
    const cornerElements = page.locator('div[class*="fixed"], div[class*="absolute"]');
    
    // Verify no corner elements exist
    await expect(cornerElements).toHaveCount(0);
  });
});
