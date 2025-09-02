import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for ItemSelector Integration Workflows
 * 
 * These tests verify the complete user workflows for:
 * - Creating new blocks
 * - Linking existing items
 * - Duplicating items
 * - Permission-based UI visibility
 */

// Helper function to navigate to a page with blocks
async function navigateToPageWithBlocks(page: Page) {
  await page.goto('/admin/content/pages/1');
  await page.waitForSelector('[data-testid="layout-blocks-container"]', { timeout: 10000 });
}

// Helper function to open block creator
async function openBlockCreator(page: Page, area = 'main') {
  await page.click(`[data-testid="add-block-button-${area}"]`);
  await page.waitForSelector('[data-testid="block-creator-dialog"]');
}

test.describe('ItemSelector Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'd1r3ctu5');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('/admin/**');
  });

  test.describe('Create New Block Workflow', () => {
    test('should create a new text block', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      
      // Open block creator
      await openBlockCreator(page);
      
      // Select "Create New" action
      await page.click('[data-testid="action-create"]');
      
      // Select collection
      await page.click('[data-testid="collection-content_text"]');
      
      // Fill in the form
      await page.fill('[data-testid="field-title"]', 'Test Text Block');
      await page.fill('[data-testid="field-content"]', 'This is test content');
      
      // Save
      await page.click('[data-testid="save-block-button"]');
      
      // Verify block appears in the list
      await expect(page.locator('[data-testid="block-item"]')).toContainText('Test Text Block');
      
      // Verify success notification
      await expect(page.locator('.v-toast.success')).toContainText('Block Created');
    });

    test('should validate required fields', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      // Select "Create New" action
      await page.click('[data-testid="action-create"]');
      
      // Select collection
      await page.click('[data-testid="collection-content_text"]');
      
      // Try to save without filling required fields
      await page.click('[data-testid="save-block-button"]');
      
      // Should show validation error
      await expect(page.locator('.field-error')).toBeVisible();
    });

    test('should respect max blocks limit', async ({ page }) => {
      // Assuming max blocks is configured to 5 for testing
      await navigateToPageWithBlocks(page);
      
      // Add 5 blocks (max limit)
      for (let i = 0; i < 5; i++) {
        await openBlockCreator(page);
        await page.click('[data-testid="action-create"]');
        await page.click('[data-testid="collection-content_text"]');
        await page.fill('[data-testid="field-title"]', `Block ${i + 1}`);
        await page.click('[data-testid="save-block-button"]');
        await page.waitForTimeout(500); // Wait for save
      }
      
      // Try to add 6th block
      await openBlockCreator(page);
      await page.click('[data-testid="action-create"]');
      
      // Should show error
      await expect(page.locator('.v-toast.error')).toContainText('Maximum blocks');
    });
  });

  test.describe('Link Existing Item Workflow', () => {
    test('should link an existing item', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      // Select "Link Existing" action
      await page.click('[data-testid="action-link"]');
      
      // Select collection
      await page.click('[data-testid="collection-content_text"]');
      
      // Wait for ItemSelector to load
      await page.waitForSelector('[data-testid="item-selector-drawer"]');
      
      // Select an item from the list
      await page.click('[data-testid="item-selector-row-1"]');
      
      // Confirm selection
      await page.click('[data-testid="item-selector-confirm"]');
      
      // Verify block is added
      await expect(page.locator('[data-testid="block-item"]').last()).toBeVisible();
      
      // Verify success notification
      await expect(page.locator('.v-toast.success')).toContainText('Items Linked');
    });

    test('should search and filter items', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      await page.click('[data-testid="action-link"]');
      await page.click('[data-testid="collection-content_text"]');
      
      // Search for specific item
      await page.fill('[data-testid="item-selector-search"]', 'Test Item');
      await page.waitForTimeout(500); // Debounce
      
      // Verify filtered results
      const items = page.locator('[data-testid^="item-selector-row"]');
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText('Test Item');
    });

    test('should handle pagination', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      await page.click('[data-testid="action-link"]');
      await page.click('[data-testid="collection-content_text"]');
      
      // Check pagination controls
      await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();
      
      // Go to next page
      await page.click('[data-testid="pagination-next"]');
      
      // Verify page changed
      await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2');
    });
  });

  test.describe('Duplicate Item Workflow', () => {
    test('should duplicate an existing item', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      // Select "Duplicate Existing" action
      await page.click('[data-testid="action-duplicate"]');
      
      // Select collection
      await page.click('[data-testid="collection-content_text"]');
      
      // Wait for ItemSelector
      await page.waitForSelector('[data-testid="item-selector-drawer"]');
      
      // Select an item to duplicate
      await page.click('[data-testid="item-selector-row-1"]');
      
      // Click duplicate button
      await page.click('[data-testid="item-selector-duplicate"]');
      
      // Verify block is added with "(Copy)" suffix
      const lastBlock = page.locator('[data-testid="block-item"]').last();
      await expect(lastBlock).toContainText('(Copy)');
      
      // Verify success notification
      await expect(page.locator('.v-toast.success')).toContainText('Items Duplicated');
    });

    test('should duplicate multiple items', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      await page.click('[data-testid="action-duplicate"]');
      await page.click('[data-testid="collection-content_text"]');
      
      // Select multiple items
      await page.click('[data-testid="item-selector-checkbox-1"]');
      await page.click('[data-testid="item-selector-checkbox-2"]');
      await page.click('[data-testid="item-selector-checkbox-3"]');
      
      // Duplicate all selected
      await page.click('[data-testid="item-selector-duplicate"]');
      
      // Verify all items were duplicated
      await expect(page.locator('[data-testid="block-item"]')).toHaveCount(3);
    });
  });

  test.describe('Permission-Based UI', () => {
    test('should hide create button without create permission', async ({ page }) => {
      // Login as user without create permission
      await page.goto('/admin/logout');
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', 'viewer@example.com');
      await page.fill('input[type="password"]', 'viewer123');
      await page.click('button[type="submit"]');
      
      await navigateToPageWithBlocks(page);
      
      // Create action should not be visible
      await openBlockCreator(page);
      await expect(page.locator('[data-testid="action-create"]')).not.toBeVisible();
      
      // Link action should still be visible (requires only read)
      await expect(page.locator('[data-testid="action-link"]')).toBeVisible();
    });

    test('should show error when trying forbidden action', async ({ page }) => {
      // Simulate trying to create without permission
      await navigateToPageWithBlocks(page);
      
      // Manually trigger create action (simulating bypassed UI)
      await page.evaluate(() => {
        // This would be the actual function call
        window.dispatchEvent(new CustomEvent('create-block-attempt', {
          detail: { collection: 'restricted_collection' }
        }));
      });
      
      // Should show permission error
      await expect(page.locator('.v-toast.error')).toContainText('Permission denied');
    });

    test('should filter collections based on permissions', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      // Only collections with appropriate permissions should be visible
      const collections = page.locator('[data-testid^="collection-"]');
      
      // Verify only permitted collections are shown
      await expect(collections).not.toContainText('restricted_collection');
      await expect(collections).toContainText('content_text');
      await expect(collections).toContainText('content_image');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      
      // Simulate network failure
      await page.route('**/api/items/**', route => route.abort());
      
      await openBlockCreator(page);
      await page.click('[data-testid="action-create"]');
      await page.click('[data-testid="collection-content_text"]');
      await page.fill('[data-testid="field-title"]', 'Test');
      await page.click('[data-testid="save-block-button"]');
      
      // Should show error message
      await expect(page.locator('.v-toast.error')).toContainText('Failed to create block');
    });

    test('should handle empty collections', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      await openBlockCreator(page);
      
      await page.click('[data-testid="action-link"]');
      await page.click('[data-testid="collection-empty_collection"]');
      
      // Should show empty state
      await expect(page.locator('[data-testid="item-selector-empty"]')).toContainText('No items found');
    });

    test('should recover from errors', async ({ page }) => {
      await navigateToPageWithBlocks(page);
      
      // First attempt fails
      await page.route('**/api/items/**', route => route.abort(), { times: 1 });
      
      await openBlockCreator(page);
      await page.click('[data-testid="action-create"]');
      await page.click('[data-testid="collection-content_text"]');
      await page.fill('[data-testid="field-title"]', 'Test');
      await page.click('[data-testid="save-block-button"]');
      
      // Should show error
      await expect(page.locator('.v-toast.error')).toBeVisible();
      
      // Retry should succeed
      await page.click('[data-testid="save-block-button"]');
      await expect(page.locator('.v-toast.success')).toContainText('Block Created');
    });
  });
});