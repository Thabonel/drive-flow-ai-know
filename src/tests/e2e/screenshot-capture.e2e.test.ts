import { test, expect, type Page } from '@playwright/test';

// Professional screenshot capture for QA evidence
test.describe('Professional QA Screenshot Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and data
    await page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('timeline_items')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              title: 'Deep Work Session',
              start_time: '2024-01-15T09:00:00.000Z',
              duration_minutes: 120,
              attention_type: 'CREATE',
              user_id: 'test-user',
            },
            {
              id: '2',
              title: 'Team Decisions',
              start_time: '2024-01-15T11:00:00.000Z',
              duration_minutes: 60,
              attention_type: 'DECIDE',
              user_id: 'test-user',
            },
            {
              id: '3',
              title: 'Stakeholder Meeting',
              start_time: '2024-01-15T13:00:00.000Z',
              duration_minutes: 90,
              attention_type: 'CONNECT',
              user_id: 'test-user',
            },
          ]),
        });
      } else if (url.includes('user_preferences')) {
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
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });

    // Navigate to timeline
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
  });

  test('captures desktop timeline overview', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for timeline to fully render
    await expect(page.locator('[data-testid=timeline-container]')).toBeVisible();
    await expect(page.locator('[data-testid=attention-budget-widget]')).toBeVisible();

    // Capture full desktop view
    await page.screenshot({
      path: 'qa-evidence/screenshots/desktop/timeline-overview.png',
      fullPage: true,
    });

    // Capture budget dashboard specifically
    await page.locator('[data-testid=attention-budget-widget]').screenshot({
      path: 'qa-evidence/screenshots/desktop/budget-dashboard.png',
    });
  });

  test('captures role selector and switching', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Initial role state
    await expect(page.locator('[data-testid=role-zone-selector]')).toBeVisible();
    await page.locator('[data-testid=role-zone-selector]').screenshot({
      path: 'qa-evidence/screenshots/desktop/role-selector-initial.png',
    });

    // Open role selector
    await page.click('[data-testid=role-mode-select]');
    await page.screenshot({
      path: 'qa-evidence/screenshots/desktop/role-selector-open.png',
    });

    // Switch to Marker mode
    await page.click('[data-testid=role-marker-option]');
    await page.waitForTimeout(500); // Allow UI to update

    await page.screenshot({
      path: 'qa-evidence/screenshots/desktop/role-selector-marker.png',
    });

    // Switch to Multiplier mode
    await page.click('[data-testid=role-mode-select]');
    await page.click('[data-testid=role-multiplier-option]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'qa-evidence/screenshots/desktop/role-selector-multiplier.png',
    });
  });

  test('captures calibration wizard workflow', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Start calibration
    await page.click('[data-testid=settings-button]');
    await page.click('[data-testid=weekly-calibration-button]');

    // Step 1: Role Assessment
    await expect(page.locator('[data-testid=calibration-step-1]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/calibration-step-1-role-assessment.png',
    });

    await page.click('[data-testid=role-maker-radio]');
    await page.click('[data-testid=calibration-next-button]');

    // Step 2: Zone Context
    await expect(page.locator('[data-testid=calibration-step-2]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/calibration-step-2-zone-context.png',
    });

    await page.click('[data-testid=zone-peacetime-radio]');
    await page.click('[data-testid=calibration-next-button]');

    // Step 3: Peak Hours
    await expect(page.locator('[data-testid=calibration-step-3]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/calibration-step-3-peak-hours.png',
    });

    await page.selectOption('[data-testid=peak-hours-start]', '09:00');
    await page.selectOption('[data-testid=peak-hours-end]', '12:00');
    await page.click('[data-testid=calibration-next-button]');

    // Step 4: Attention Budgets
    await expect(page.locator('[data-testid=calibration-step-4]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/calibration-step-4-attention-budgets.png',
    });

    await page.locator('[data-testid=create-budget-slider]').fill('240');
    await page.locator('[data-testid=decide-budget-slider]').fill('120');
    await page.click('[data-testid=calibration-next-button]');

    // Completion
    await expect(page.locator('[data-testid=calibration-complete]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/calibration-complete.png',
    });
  });

  test('captures tablet responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // Wait for responsive layout
    await expect(page.locator('[data-testid=timeline-container]')).toBeVisible();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'qa-evidence/screenshots/tablet/timeline-responsive.png',
      fullPage: true,
    });

    // Test tablet navigation
    await page.click('[data-testid=mobile-menu-button]');
    await expect(page.locator('[data-testid=mobile-navigation]')).toBeVisible();

    await page.screenshot({
      path: 'qa-evidence/screenshots/tablet/mobile-navigation.png',
    });

    // Budget widget in compact mode
    await page.locator('[data-testid=attention-budget-compact]').screenshot({
      path: 'qa-evidence/screenshots/tablet/budget-compact.png',
    });
  });

  test('captures mobile experience', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for mobile layout
    await expect(page.locator('[data-testid=mobile-timeline]')).toBeVisible();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'qa-evidence/screenshots/mobile/timeline-mobile.png',
      fullPage: true,
    });

    // Test mobile swipe actions
    const timelineItem = page.locator('[data-testid=timeline-item-1]');

    // Simulate swipe gesture
    await timelineItem.hover();
    await timelineItem.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    await timelineItem.dispatchEvent('touchmove', {
      touches: [{ clientX: 50, clientY: 100 }],
    });
    await timelineItem.dispatchEvent('touchend', {});

    // Capture swipe actions menu
    await expect(page.locator('[data-testid=mobile-action-menu]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/mobile/swipe-actions.png',
    });

    // Mobile calibration wizard
    await page.click('[data-testid=settings-button]');
    await page.click('[data-testid=weekly-calibration-button]');

    await expect(page.locator('[data-testid=mobile-calibration-wizard]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/mobile/mobile-calibration.png',
    });
  });

  test('captures attention type visualizations', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Focus on attention type selector
    await page.click('[data-testid=add-task-button]');
    await expect(page.locator('[data-testid=attention-type-selector]')).toBeVisible();

    await page.screenshot({
      path: 'qa-evidence/screenshots/desktop/attention-type-selector.png',
    });

    // Show different attention types in timeline
    const createItems = page.locator('[data-testid*="attention-type-create"]');
    if (await createItems.count() > 0) {
      await createItems.first().screenshot({
        path: 'qa-evidence/screenshots/desktop/attention-type-create.png',
      });
    }

    const decideItems = page.locator('[data-testid*="attention-type-decide"]');
    if (await decideItems.count() > 0) {
      await decideItems.first().screenshot({
        path: 'qa-evidence/screenshots/desktop/attention-type-decide.png',
      });
    }

    const connectItems = page.locator('[data-testid*="attention-type-connect"]');
    if (await connectItems.count() > 0) {
      await connectItems.first().screenshot({
        path: 'qa-evidence/screenshots/desktop/attention-type-connect.png',
      });
    }
  });

  test('captures performance with large dataset', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Mock large dataset
    await page.route('**/rest/v1/timeline_items*', async (route) => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Event ${i + 1}`,
        start_time: new Date(Date.now() + i * 15 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        attention_type: ['CREATE', 'DECIDE', 'CONNECT', 'REVIEW'][i % 4],
        user_id: 'test-user',
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Capture performance view
    await expect(page.locator('[data-testid=timeline-container]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/performance/large-dataset-timeline.png',
      fullPage: true,
    });

    // Test scrolling performance
    const timeline = page.locator('[data-testid=timeline-scroll-container]');
    for (let i = 0; i < 5; i++) {
      await timeline.evaluate((el, scrollTop) => {
        el.scrollTop = scrollTop;
      }, i * 500);
      await page.waitForTimeout(100);
    }

    await page.screenshot({
      path: 'qa-evidence/screenshots/performance/scrolling-performance.png',
    });
  });

  test('captures delegation workflow', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Select item and start delegation
    await page.click('[data-testid=timeline-item-1]');
    await page.click('[data-testid=delegate-button]');

    await expect(page.locator('[data-testid=delegation-dialog]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/delegation-dialog.png',
    });

    // Fill delegation form
    await page.fill('[data-testid=delegate-assignee]', 'John Doe');
    await page.selectOption('[data-testid=trust-level-select]', 'HIGH');
    await page.fill('[data-testid=delegation-notes]', 'Please handle this task with care');

    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/delegation-form-filled.png',
    });

    await page.click('[data-testid=confirm-delegation]');

    // Show delegation indicator in timeline
    await expect(page.locator('[data-testid=delegation-indicator-1]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/delegation-complete.png',
    });
  });

  test('captures accessibility features', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Focus management demonstration
    await page.keyboard.press('Tab');
    await page.screenshot({
      path: 'qa-evidence/screenshots/accessibility/focus-management.png',
    });

    // High contrast mode
    await page.click('[data-testid=accessibility-settings]');
    await page.click('[data-testid=high-contrast-toggle]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'qa-evidence/screenshots/accessibility/high-contrast-mode.png',
    });

    // Screen reader announcements area
    await page.locator('[data-testid=screen-reader-announcements]').screenshot({
      path: 'qa-evidence/screenshots/accessibility/screen-reader-announcements.png',
    });

    // Keyboard shortcuts help
    await page.keyboard.press('Control+?');
    await expect(page.locator('[data-testid=keyboard-shortcuts-help]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/accessibility/keyboard-shortcuts.png',
    });
  });

  test('captures error states and warnings', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Trigger budget violation warning
    await page.click('[data-testid=add-task-button]');
    await page.fill('[data-testid=task-title]', 'Excessive Deep Work');
    await page.selectOption('[data-testid=attention-type-select]', 'CREATE');
    await page.fill('[data-testid=duration-input]', '300'); // Exceeds budget
    await page.click('[data-testid=save-task]');

    // Capture warning state
    await expect(page.locator('[data-testid=budget-violation-warning]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/budget-violation-warning.png',
    });

    // Context switch warning
    await page.click('[data-testid=add-task-button]');
    await page.fill('[data-testid=task-title]', 'Quick Decision');
    await page.selectOption('[data-testid=attention-type-select]', 'DECIDE');
    await page.fill('[data-testid=duration-input]', '15');
    await page.click('[data-testid=save-task]');

    await expect(page.locator('[data-testid=context-switch-warning]')).toBeVisible();
    await page.screenshot({
      path: 'qa-evidence/screenshots/workflow/context-switch-warning.png',
    });
  });
});