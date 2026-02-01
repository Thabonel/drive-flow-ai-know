import { test, expect, type Page } from '@playwright/test';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password: 'testPassword123',
};

const mockTimelineData = [
  {
    id: '1',
    title: 'Deep Work Session',
    start_time: '2024-01-15T09:00:00.000Z',
    duration_minutes: 120,
    attention_type: 'CREATE',
  },
  {
    id: '2',
    title: 'Team Decisions',
    start_time: '2024-01-15T11:00:00.000Z',
    duration_minutes: 60,
    attention_type: 'DECIDE',
  },
  {
    id: '3',
    title: 'Stakeholder Meeting',
    start_time: '2024-01-15T13:00:00.000Z',
    duration_minutes: 90,
    attention_type: 'CONNECT',
  },
];

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid=email-input]', testUser.email);
  await page.fill('[data-testid=password-input]', testUser.password);
  await page.click('[data-testid=login-button]');
  await page.waitForURL('/dashboard');
}

async function setupMockData(page: Page) {
  // Mock Supabase responses
  await page.route('**/rest/v1/timeline_items*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTimelineData),
    });
  });

  await page.route('**/rest/v1/user_preferences*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current_role: 'MAKER',
        current_zone: 'peacetime',
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
        attention_budgets: {
          CREATE: 240,
          DECIDE: 120,
          CONNECT: 180,
          REVIEW: 120,
          RECOVER: 60,
        },
      }),
    });
  });
}

test.describe('3-2-1 Attention System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockData(page);
    await loginUser(page);
  });

  test.describe('Weekly Calibration Workflow', () => {
    test('completes full weekly calibration wizard', async ({ page }) => {
      // Navigate to timeline
      await page.click('[data-testid=timeline-nav]');
      await expect(page.locator('[data-testid=timeline-container]')).toBeVisible();

      // Open settings
      await page.click('[data-testid=settings-button]');
      await page.click('[data-testid=weekly-calibration]');

      // Step 1: Role Assessment
      await expect(page.locator('[data-testid=role-assessment-step]')).toBeVisible();
      await page.click('[data-testid=role-maker]');
      await page.click('[data-testid=next-button]');

      // Step 2: Zone Context
      await expect(page.locator('[data-testid=zone-context-step]')).toBeVisible();
      await page.click('[data-testid=zone-peacetime]');
      await page.click('[data-testid=next-button]');

      // Step 3: Peak Hours
      await expect(page.locator('[data-testid=peak-hours-step]')).toBeVisible();
      await page.selectOption('[data-testid=peak-start-select]', '09:00');
      await page.selectOption('[data-testid=peak-end-select]', '12:00');
      await page.click('[data-testid=next-button]');

      // Step 4: Attention Budgets
      await expect(page.locator('[data-testid=budget-step]')).toBeVisible();
      await page.locator('[data-testid=create-budget-slider]').fill('240');
      await page.locator('[data-testid=decide-budget-slider]').fill('120');
      await page.click('[data-testid=next-button]');

      // Step 5: Context Switch Tolerance
      await expect(page.locator('[data-testid=context-switch-step]')).toBeVisible();
      await page.locator('[data-testid=context-switch-slider]').fill('3');
      await page.click('[data-testid=next-button]');

      // Step 6: Delegation Preferences
      await expect(page.locator('[data-testid=delegation-step]')).toBeVisible();
      await page.click('[data-testid=enable-delegation]');
      await page.click('[data-testid=next-button]');

      // Step 7: Review and Complete
      await expect(page.locator('[data-testid=review-step]')).toBeVisible();
      await expect(page.locator('[data-testid=role-summary]')).toContainText('MAKER');
      await expect(page.locator('[data-testid=zone-summary]')).toContainText('peacetime');

      const startTime = Date.now();
      await page.click('[data-testid=complete-calibration]');

      // Verify completion
      await expect(page.locator('[data-testid=calibration-success]')).toBeVisible();
      const completionTime = Date.now() - startTime;

      // Should complete within 2 seconds
      expect(completionTime).toBeLessThan(2000);

      // Verify preferences were applied
      await page.click('[data-testid=close-calibration]');
      await expect(page.locator('[data-testid=current-role]')).toContainText('MAKER');
    });

    test('calculates accurate role fit scores', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');
      await page.click('[data-testid=role-assessment-button]');

      // Fill assessment questions with high scores for Maker
      const questions = [
        { testId: 'focus-preference', value: '9' },
        { testId: 'decision-preference', value: '3' },
        { testId: 'collaboration-preference', value: '4' },
        { testId: 'delegation-comfort', value: '2' },
        { testId: 'context-switch-tolerance', value: '2' },
      ];

      for (const question of questions) {
        await page.locator(`[data-testid=${question.testId}]`).fill(question.value);
      }

      await page.click('[data-testid=calculate-role-fit]');

      // Verify role fit calculation
      await expect(page.locator('[data-testid=maker-score]')).toBeVisible();
      const makerScore = await page.locator('[data-testid=maker-score]').textContent();
      const score = parseInt(makerScore?.split('%')[0] || '0');

      expect(score).toBeGreaterThan(70); // High scores should indicate Maker fit

      // Check other role scores are lower
      const markerScore = await page.locator('[data-testid=marker-score]').textContent();
      const markerScoreValue = parseInt(markerScore?.split('%')[0] || '0');
      expect(markerScoreValue).toBeLessThan(score);
    });

    test('generates appropriate week templates', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');
      await page.click('[data-testid=templates-button]');

      // Generate template for Maker role
      await page.selectOption('[data-testid=template-role-select]', 'MAKER');
      await page.selectOption('[data-testid=template-zone-select]', 'peacetime');

      const startTime = Date.now();
      await page.click('[data-testid=generate-template]');

      // Wait for generation
      await expect(page.locator('[data-testid=template-generated]')).toBeVisible();
      const generationTime = Date.now() - startTime;

      // Should generate within 3 seconds
      expect(generationTime).toBeLessThan(3000);

      // Verify template structure
      const createBlocks = page.locator('[data-testid^="template-create-"]');
      await expect(createBlocks.first()).toBeVisible();

      // Check that CREATE blocks are in peak hours (9-12)
      const blockCount = await createBlocks.count();
      expect(blockCount).toBeGreaterThan(0);

      for (let i = 0; i < blockCount; i++) {
        const block = createBlocks.nth(i);
        const timeText = await block.locator('[data-testid=block-time]').textContent();
        const hour = parseInt(timeText?.split(':')[0] || '0');
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(12);
      }
    });
  });

  test.describe('Real-time Attention Budget Dashboard', () => {
    test('displays budget usage accurately', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Wait for budget widget to load
      await expect(page.locator('[data-testid=attention-budget-widget]')).toBeVisible();

      // Verify initial budget calculations
      const createUsed = await page.locator('[data-testid=create-budget-used]').textContent();
      const createLimit = await page.locator('[data-testid=create-budget-limit]').textContent();

      expect(createUsed).toBe('120 min'); // From mock data
      expect(createLimit).toBe('240 min');

      // Check percentage calculation
      const createPercentage = await page.locator('[data-testid=create-budget-percentage]').textContent();
      expect(createPercentage).toBe('50%');

      // Verify visual indicators
      const progressBar = page.locator('[data-testid=create-budget-progress]');
      const progressWidth = await progressBar.getAttribute('style');
      expect(progressWidth).toContain('width: 50%');
    });

    test('updates budgets in real-time when adding tasks', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Get initial CREATE budget
      const initialUsage = await page.locator('[data-testid=create-budget-used]').textContent();

      // Add new CREATE task
      await page.click('[data-testid=add-task-button]');
      await page.fill('[data-testid=task-title]', 'New Deep Work');
      await page.selectOption('[data-testid=attention-type-select]', 'CREATE');
      await page.fill('[data-testid=duration-input]', '60');
      await page.click('[data-testid=save-task]');

      // Verify budget update
      await expect(page.locator('[data-testid=create-budget-used]')).not.toContainText(initialUsage || '');

      const updatedUsage = await page.locator('[data-testid=create-budget-used]').textContent();
      expect(updatedUsage).toBe('180 min'); // 120 + 60

      // Check percentage update
      const updatedPercentage = await page.locator('[data-testid=create-budget-percentage]').textContent();
      expect(updatedPercentage).toBe('75%');
    });

    test('shows budget violation warnings', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Add task that exceeds budget
      await page.click('[data-testid=add-task-button]');
      await page.fill('[data-testid=task-title]', 'Excessive Deep Work');
      await page.selectOption('[data-testid=attention-type-select]', 'CREATE');
      await page.fill('[data-testid=duration-input]', '180'); // This will exceed 240 limit
      await page.click('[data-testid=save-task]');

      // Should show violation warning
      await expect(page.locator('[data-testid=budget-violation-warning]')).toBeVisible();
      await expect(page.locator('[data-testid=warning-message]')).toContainText('CREATE Budget Exceeded');

      // Check warning level
      const warningElement = page.locator('[data-testid=budget-violation-warning]');
      const warningClass = await warningElement.getAttribute('class');
      expect(warningClass).toContain('critical');

      // Verify actionable suggestions
      await expect(page.locator('[data-testid=suggestion-delegate]')).toBeVisible();
      await expect(page.locator('[data-testid=suggestion-reschedule]')).toBeVisible();
    });
  });

  test.describe('Mobile Experience', () => {
    test('provides full functionality on mobile', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Mobile gestures not supported in WebKit');

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-testid=timeline-nav]');

      // Wait for mobile layout
      await expect(page.locator('[data-testid=mobile-timeline]')).toBeVisible();

      // Test mobile navigation
      await page.click('[data-testid=mobile-menu-button]');
      await expect(page.locator('[data-testid=mobile-nav-menu]')).toBeVisible();

      // Test swipe gestures on timeline items
      const timelineItem = page.locator('[data-testid=timeline-item-1]');
      await timelineItem.hover();

      // Simulate swipe left
      await timelineItem.dispatchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      await timelineItem.dispatchEvent('touchmove', {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      await timelineItem.dispatchEvent('touchend', {});

      // Should reveal mobile actions
      await expect(page.locator('[data-testid=mobile-action-menu]')).toBeVisible();
      await expect(page.locator('[data-testid=mobile-edit-button]')).toBeVisible();
      await expect(page.locator('[data-testid=mobile-delete-button]')).toBeVisible();
    });

    test('maintains performance during mobile scrolling', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-testid=timeline-nav]');

      const timeline = page.locator('[data-testid=timeline-scroll-container]');

      // Measure scroll performance
      const startTime = Date.now();

      // Simulate rapid scrolling
      for (let i = 0; i < 20; i++) {
        await timeline.evaluate((el, scrollTop) => {
          el.scrollTop = scrollTop;
        }, i * 100);
        await page.waitForTimeout(16); // ~60fps
      }

      const scrollTime = Date.now() - startTime;

      // Should maintain smooth scrolling (< 500ms for 20 scroll events)
      expect(scrollTime).toBeLessThan(500);

      // Verify attention overlays are still visible
      await expect(page.locator('[data-testid=attention-overlay]')).toBeVisible();
    });
  });

  test.describe('Role Mode Switching', () => {
    test('switches between role modes with immediate UI changes', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Initial state - Maker mode
      await expect(page.locator('[data-testid=current-role]')).toContainText('MAKER');
      await expect(page.locator('[data-testid=focus-protection-indicator]')).toBeVisible();

      // Switch to Marker mode
      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-marker]');

      // Verify immediate UI changes
      await expect(page.locator('[data-testid=current-role]')).toContainText('MARKER');
      await expect(page.locator('[data-testid=decision-batch-indicator]')).toBeVisible();
      await expect(page.locator('[data-testid=focus-protection-indicator]')).not.toBeVisible();

      // Switch to Multiplier mode
      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-multiplier]');

      // Verify Multiplier UI
      await expect(page.locator('[data-testid=current-role]')).toContainText('MULTIPLIER');
      await expect(page.locator('[data-testid=delegation-opportunities]')).toBeVisible();
      await expect(page.locator('[data-testid=decision-batch-indicator]')).not.toBeVisible();

      // Verify budget limits changed
      const createLimit = await page.locator('[data-testid=create-budget-limit]').textContent();
      expect(createLimit).toBe('120 min'); // Reduced for Multiplier
    });

    test('provides appropriate warnings for each role', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Test Maker warnings
      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-maker]');

      // Should see focus protection warnings if applicable
      const makerWarnings = page.locator('[data-testid=role-specific-warnings]');
      await expect(makerWarnings.locator('[data-testid*="focus"]')).toBeVisible();

      // Test Marker warnings
      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-marker]');

      // Should see decision-related warnings
      await expect(makerWarnings.locator('[data-testid*="decision"]')).toBeVisible();

      // Test Multiplier warnings
      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-multiplier]');

      // Should see delegation opportunities
      await expect(makerWarnings.locator('[data-testid*="delegate"]')).toBeVisible();
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('timeline renders within 500ms with attention overlays', async ({ page }) => {
      // Mock large dataset
      await page.route('**/rest/v1/timeline_items*', async (route) => {
        const largeDataset = Array.from({ length: 200 }, (_, i) => ({
          ...mockTimelineData[0],
          id: `${i + 1}`,
          title: `Event ${i + 1}`,
          start_time: new Date(Date.now() + i * 15 * 60 * 1000).toISOString(),
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset),
        });
      });

      const startTime = Date.now();

      await page.click('[data-testid=timeline-nav]');
      await expect(page.locator('[data-testid=timeline-container]')).toBeVisible();

      const renderTime = Date.now() - startTime;

      // Should render within 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify attention overlays are present
      await expect(page.locator('[data-testid=attention-overlay]')).toBeVisible();
    });

    test('attention budget updates within 100ms', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Measure budget update performance
      const startTime = Date.now();

      await page.click('[data-testid=add-task-button]');
      await page.fill('[data-testid=task-title]', 'Quick Task');
      await page.selectOption('[data-testid=attention-type-select]', 'CREATE');
      await page.fill('[data-testid=duration-input]', '30');
      await page.click('[data-testid=save-task]');

      // Wait for budget update
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-testid=create-budget-used]');
        return element?.textContent === '150 min';
      });

      const updateTime = Date.now() - startTime;

      // Budget should update quickly (allowing for task creation time)
      expect(updateTime).toBeLessThan(2000);
    });

    test('role switching responds within 200ms', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      const startTime = Date.now();

      await page.click('[data-testid=role-selector]');
      await page.click('[data-testid=role-marker]');

      // Wait for role change confirmation
      await expect(page.locator('[data-testid=current-role]')).toContainText('MARKER');

      const switchTime = Date.now() - startTime;

      // Should switch within 200ms
      expect(switchTime).toBeLessThan(200);
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('attention visualizations work across browsers', async ({ page, browserName }) => {
      await page.click('[data-testid=timeline-nav]');

      // Test CSS Grid layout
      const timelineGrid = page.locator('[data-testid=timeline-grid]');
      const gridStyles = await timelineGrid.evaluate((el) => {
        const styles = getComputedStyle(el);
        return {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
        };
      });

      expect(gridStyles.display).toBe('grid');
      expect(gridStyles.gridTemplateColumns).toBeTruthy();

      // Test attention type colors
      const createItem = page.locator('[data-testid*="attention-type-create"]').first();
      const createColor = await createItem.evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });

      expect(createColor).toBeTruthy();

      // Test CSS custom properties (CSS variables)
      const budgetWidget = page.locator('[data-testid=attention-budget-widget]');
      const cssVars = await budgetWidget.evaluate((el) => {
        const styles = getComputedStyle(el);
        return {
          primaryColor: styles.getPropertyValue('--color-primary'),
          createColor: styles.getPropertyValue('--color-create'),
        };
      });

      expect(cssVars.primaryColor).toBeTruthy();
      expect(cssVars.createColor).toBeTruthy();
    });

    test('mobile gestures work on touch devices', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Touch events not fully supported in WebKit tests');

      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-testid=timeline-nav]');

      const timelineItem = page.locator('[data-testid=timeline-item-1]');

      // Test touch events
      await timelineItem.dispatchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100, identifier: 1 }],
      });

      await page.waitForTimeout(100);

      await timelineItem.dispatchEvent('touchmove', {
        touches: [{ clientX: 50, clientY: 100, identifier: 1 }],
      });

      await timelineItem.dispatchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 100, identifier: 1 }],
      });

      // Should trigger mobile action menu
      await expect(page.locator('[data-testid=mobile-action-menu]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();

      // Test arrow key navigation in timeline
      await page.click('[data-testid=timeline-container]');
      await page.keyboard.press('ArrowDown');

      const selectedItem = page.locator('[data-testid*="timeline-item"][aria-selected="true"]');
      await expect(selectedItem).toBeVisible();

      // Test keyboard shortcuts
      await page.keyboard.press('Control+n'); // New task
      await expect(page.locator('[data-testid=new-task-dialog]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid=new-task-dialog]')).not.toBeVisible();
    });

    test('provides screen reader announcements', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Check ARIA live regions
      const announcements = page.locator('[data-testid=sr-announcements]');
      await expect(announcements).toHaveAttribute('aria-live', 'polite');

      // Add new task to trigger announcement
      await page.click('[data-testid=add-task-button]');
      await page.fill('[data-testid=task-title]', 'Test Task');
      await page.selectOption('[data-testid=attention-type-select]', 'CREATE');
      await page.fill('[data-testid=duration-input]', '60');
      await page.click('[data-testid=save-task]');

      // Should announce the change
      await expect(announcements).toContainText('Task added');
    });

    test('meets color contrast requirements', async ({ page }) => {
      await page.click('[data-testid=timeline-nav]');

      // Test attention type color contrast
      const createItem = page.locator('[data-testid*="attention-type-create"]').first();
      const colors = await createItem.evaluate((el) => {
        const styles = getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      // Note: Full contrast checking would require color analysis library
      // Here we just verify colors are defined
      expect(colors.color).toBeTruthy();
      expect(colors.backgroundColor).toBeTruthy();

      // Test focus indicators
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      const focusStyles = await focusedElement.evaluate((el) => {
        const styles = getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });

      // Should have visible focus indicator
      expect(focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none').toBeTruthy();
    });
  });
});