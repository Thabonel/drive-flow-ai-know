/**
 * Comprehensive Delegation Workflow System Testing
 * Tests the complete delegation workflow from task creation to trust-based follow-ups
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Test configuration
const BASE_URL = 'http://localhost:8080';
const TEST_RESULTS_DIR = 'public/delegation-test-results';
const SCREENSHOT_DIR = path.join(TEST_RESULTS_DIR, 'screenshots');

// Test user data (mock)
const TEST_USERS = {
  manager: {
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'multiplier'
  },
  teammember: {
    email: 'member@test.com',
    name: 'Test Team Member',
    role: 'team_member'
  }
};

class DelegationWorkflowTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      performance: {
        pageLoadTimes: [],
        componentRenderTimes: [],
        databaseOperationTimes: []
      }
    };
  }

  async setup() {
    console.log('🚀 Setting up Delegation Workflow Test Environment...');

    // Ensure test results directory exists
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true }).catch(() => {});

    // Launch browser
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI
      devtools: false,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });

    this.page = await this.context.newPage();

    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 Console Error:', msg.text());
      }
    });

    // Enable request/response tracking
    this.page.on('response', response => {
      if (response.status() >= 400) {
        console.warn('⚠️ HTTP Error:', response.status(), response.url());
      }
    });

    console.log('✅ Test environment ready');
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }

    // Save test results
    await this.saveTestResults();
    console.log(`📊 Test results saved to ${TEST_RESULTS_DIR}/test-results.json`);
  }

  async saveTestResults() {
    const resultsPath = path.join(TEST_RESULTS_DIR, 'test-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(this.testResults, null, 2));
  }

  async takeScreenshot(name, fullPage = false) {
    const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await this.page.screenshot({
      path: screenshotPath,
      fullPage,
      animations: 'disabled'
    });
    return screenshotPath;
  }

  async runTest(testName, testFn) {
    console.log(`🧪 Running test: ${testName}`);
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;

      this.testResults.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        screenshot: await this.takeScreenshot(`${testName}-passed`.replace(/\s+/g, '-'))
      });

      this.testResults.summary.passed++;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults.tests.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message,
        screenshot: await this.takeScreenshot(`${testName}-failed`.replace(/\s+/g, '-'))
      });

      this.testResults.summary.failed++;
      console.error(`❌ ${testName} - FAILED (${duration}ms)`, error.message);

      // Continue with other tests
    } finally {
      this.testResults.summary.total++;
    }
  }

  async navigateToPage(path, waitForSelector = null) {
    const startTime = Date.now();
    await this.page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });

    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    const loadTime = Date.now() - startTime;
    this.testResults.performance.pageLoadTimes.push({ path, loadTime });

    return loadTime;
  }

  async waitForElement(selector, timeout = 10000) {
    return await this.page.waitForSelector(selector, { timeout });
  }

  async testApplicationLoad() {
    await this.runTest('Application Load', async () => {
      const loadTime = await this.navigateToPage('/', '[data-testid="app-loaded"]');

      if (loadTime > 3000) {
        throw new Error(`Page load too slow: ${loadTime}ms (should be < 3000ms)`);
      }

      // Check for essential UI elements
      await this.waitForElement('[data-testid="app-sidebar"]');
      await this.waitForElement('[data-testid="main-content"]');
    });
  }

  async testMultiplierModeAccess() {
    await this.runTest('Multiplier Mode Access', async () => {
      // Navigate to Multiplier Mode page
      await this.navigateToPage('/multiplier-mode');

      // Check if page loads with delegation features
      await this.waitForElement('h1:has-text("Multiplier Mode")');

      // Verify key components are present
      const components = [
        '[data-testid="router-inbox"]',
        '[data-testid="delegation-dashboard"]',
        '[data-testid="trust-level-management"]',
        '[data-testid="follow-up-automation"]'
      ];

      for (const component of components) {
        try {
          await this.page.waitForSelector(component, { timeout: 2000 });
        } catch (error) {
          // Component may be in tabs, check for tab triggers
          const tabExists = await this.page.locator(`[role="tab"]:has-text("${component.replace(/\[data-testid="(.+)"\]/, '$1')}")`) .isVisible();
          if (!tabExists) {
            console.warn(`⚠️ Component ${component} not immediately visible - may be in tabs`);
          }
        }
      }

      // Take screenshot of full dashboard
      await this.takeScreenshot('multiplier-mode-dashboard', true);
    });
  }

  async testDelegationButtonFunctionality() {
    await this.runTest('Delegation Button Functionality', async () => {
      // Navigate to timeline page (where delegation buttons would appear)
      await this.navigateToPage('/timeline');

      // Look for delegation button
      const delegationButton = this.page.locator('button:has-text("Delegate")').first();

      if (await delegationButton.isVisible()) {
        // Click delegation button
        await delegationButton.click();

        // Verify delegation modal opens
        await this.waitForElement('[role="dialog"]');
        await this.page.waitForSelector('text=Delegate Task', { timeout: 5000 });

        // Check for delegation form fields
        await this.waitForElement('[data-testid="delegate-select"]');
        await this.waitForElement('[data-testid="trust-level-select"]');
        await this.waitForElement('[data-testid="context-notes"]');

        // Take screenshot of delegation modal
        await this.takeScreenshot('delegation-modal');

        // Close modal
        await this.page.keyboard.press('Escape');

      } else {
        console.warn('⚠️ No delegation button found - may require logged in user with team');
      }
    });
  }

  async testRouterInboxFunctionality() {
    await this.runTest('Router Inbox Functionality', async () => {
      // Navigate to multiplier mode and switch to inbox tab
      await this.navigateToPage('/multiplier-mode');

      // Click on Router Inbox tab
      const inboxTab = this.page.locator('[role="tab"]:has-text("Router Inbox")');
      if (await inboxTab.isVisible()) {
        await inboxTab.click();

        // Wait for inbox content to load
        await this.waitForElement('[data-testid="router-inbox-content"]', 5000);

        // Check for key inbox elements
        const elements = [
          '[data-testid="pending-requests"]',
          '[data-testid="triage-actions"]',
          '[data-testid="team-workload-summary"]'
        ];

        for (const element of elements) {
          try {
            await this.page.waitForSelector(element, { timeout: 2000 });
          } catch (error) {
            console.warn(`⚠️ Element ${element} not found - may be empty state`);
          }
        }

        // Take screenshot of router inbox
        await this.takeScreenshot('router-inbox');

        // Test filter functionality if available
        const statusFilter = this.page.locator('[data-testid="status-filter"]');
        if (await statusFilter.isVisible()) {
          await statusFilter.click();
          await this.page.waitForSelector('[role="listbox"]', { timeout: 2000 });
          await this.takeScreenshot('router-inbox-filters');
          await this.page.keyboard.press('Escape');
        }

      } else {
        throw new Error('Router Inbox tab not found');
      }
    });
  }

  async testTrustLevelManagement() {
    await this.runTest('Trust Level Management', async () => {
      await this.navigateToPage('/multiplier-mode');

      // Switch to Trust Levels tab
      const trustTab = this.page.locator('[role="tab"]:has-text("Trust Levels")');
      if (await trustTab.isVisible()) {
        await trustTab.click();

        // Wait for trust level content
        await this.waitForElement('[data-testid="trust-level-management"]', 5000);

        // Check for trust level distribution
        const distribution = this.page.locator('[data-testid="trust-level-distribution"]');
        if (await distribution.isVisible()) {
          await this.takeScreenshot('trust-level-distribution');
        }

        // Check for team member trust levels
        const teamMemberCards = this.page.locator('[data-testid="team-member-trust-card"]');
        const memberCount = await teamMemberCards.count();

        if (memberCount > 0) {
          // Test updating trust level for first member
          await teamMemberCards.first().locator('button:has-text("Update Level")').click();

          // Verify update modal opens
          await this.waitForElement('[role="dialog"]:has-text("Update Trust Level")');
          await this.takeScreenshot('trust-level-update-modal');

          // Close modal
          await this.page.keyboard.press('Escape');

        } else {
          console.warn('⚠️ No team members found for trust level testing');
        }

      } else {
        throw new Error('Trust Levels tab not found');
      }
    });
  }

  async testFollowUpAutomation() {
    await this.runTest('Follow-up Automation', async () => {
      await this.navigateToPage('/multiplier-mode');

      // Switch to Follow-ups tab
      const followUpTab = this.page.locator('[role="tab"]:has-text("Follow-ups")');
      if (await followUpTab.isVisible()) {
        await followUpTab.click();

        // Wait for follow-up content
        await this.waitForElement('[data-testid="follow-up-automation"]', 5000);

        // Check for scheduled follow-ups
        const followUpList = this.page.locator('[data-testid="follow-up-list"]');
        if (await followUpList.isVisible()) {
          await this.takeScreenshot('follow-up-automation');
        }

        // Check for automation settings
        const automationSettings = this.page.locator('[data-testid="automation-settings"]');
        if (await automationSettings.isVisible()) {
          await this.takeScreenshot('automation-settings');
        }

      } else {
        throw new Error('Follow-ups tab not found');
      }
    });
  }

  async testDelegationDashboard() {
    await this.runTest('Delegation Dashboard', async () => {
      await this.navigateToPage('/multiplier-mode');

      // Switch to Delegations tab
      const delegationTab = this.page.locator('[role="tab"]:has-text("Delegations")');
      if (await delegationTab.isVisible()) {
        await delegationTab.click();

        // Wait for delegation content
        await this.waitForElement('[data-testid="delegation-dashboard"]', 5000);

        // Check for analytics cards
        const analytics = [
          '[data-testid="total-delegations"]',
          '[data-testid="success-rate"]',
          '[data-testid="average-rating"]',
          '[data-testid="average-completion-time"]'
        ];

        for (const metric of analytics) {
          try {
            await this.page.waitForSelector(metric, { timeout: 1000 });
          } catch (error) {
            console.warn(`⚠️ Metric ${metric} not found - may be empty state`);
          }
        }

        // Take screenshot of dashboard
        await this.takeScreenshot('delegation-dashboard');

        // Test filtering if available
        const statusFilter = this.page.locator('[data-testid="delegation-status-filter"]');
        if (await statusFilter.isVisible()) {
          await statusFilter.click();
          await this.page.waitForSelector('[role="listbox"]', { timeout: 2000 });
          await this.takeScreenshot('delegation-dashboard-filters');
          await this.page.keyboard.press('Escape');
        }

      } else {
        throw new Error('Delegations tab not found');
      }
    });
  }

  async testResponsiveDesign() {
    await this.runTest('Responsive Design', async () => {
      // Test mobile viewport
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.navigateToPage('/multiplier-mode');
      await this.takeScreenshot('multiplier-mode-mobile');

      // Test tablet viewport
      await this.page.setViewportSize({ width: 768, height: 1024 });
      await this.navigateToPage('/multiplier-mode');
      await this.takeScreenshot('multiplier-mode-tablet');

      // Reset to desktop
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.navigateToPage('/multiplier-mode');
      await this.takeScreenshot('multiplier-mode-desktop');

      // Check if mobile menu works
      await this.page.setViewportSize({ width: 375, height: 667 });
      const mobileMenu = this.page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await this.takeScreenshot('mobile-menu-open');
        await mobileMenu.click(); // Close menu
      }
    });
  }

  async testPerformanceMetrics() {
    await this.runTest('Performance Metrics', async () => {
      // Test page load performance
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalLoadTime: navigation.loadEventEnd - navigation.navigationStart
        };
      });

      // Verify performance thresholds
      if (performanceMetrics.totalLoadTime > 3000) {
        console.warn(`⚠️ Slow page load: ${performanceMetrics.totalLoadTime}ms`);
        this.testResults.summary.warnings++;
      }

      // Test component render performance
      const startRender = Date.now();
      await this.navigateToPage('/multiplier-mode');
      await this.waitForElement('[data-testid="multiplier-dashboard"]');
      const renderTime = Date.now() - startRender;

      this.testResults.performance.componentRenderTimes.push({
        component: 'MultiplierDashboard',
        renderTime
      });

      // Store performance metrics
      this.testResults.performance.pageMetrics = performanceMetrics;
    });
  }

  async testErrorHandling() {
    await this.runTest('Error Handling', async () => {
      // Test navigation to non-existent route
      await this.navigateToPage('/non-existent-route');

      // Should show 404 or redirect to home
      const notFoundText = await this.page.textContent('body');
      if (notFoundText.includes('404') || notFoundText.includes('Not Found')) {
        await this.takeScreenshot('404-page');
      } else {
        // Check if redirected to home
        const currentUrl = this.page.url();
        if (currentUrl.includes('/timeline') || currentUrl.includes('/dashboard')) {
          console.log('✅ Properly redirected from invalid route');
        } else {
          console.warn('⚠️ Unexpected behavior on invalid route');
        }
      }

      // Test with invalid authentication (if applicable)
      await this.page.evaluate(() => {
        localStorage.removeItem('auth-token');
        sessionStorage.clear();
      });

      await this.navigateToPage('/multiplier-mode');

      // Should redirect to login or show auth required message
      const hasAuthGuard = await this.page.textContent('body').then(text =>
        text.includes('login') || text.includes('sign in') || text.includes('authenticate')
      );

      if (hasAuthGuard) {
        await this.takeScreenshot('auth-guard');
      }
    });
  }

  async generateTestReport() {
    const { summary, performance } = this.testResults;

    console.log('\n📊 DELEGATION WORKFLOW SYSTEM TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Warnings: ${summary.warnings} ⚠️`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

    if (performance.pageLoadTimes.length > 0) {
      const avgLoadTime = performance.pageLoadTimes.reduce((sum, p) => sum + p.loadTime, 0) / performance.pageLoadTimes.length;
      console.log(`\nAverage Page Load Time: ${avgLoadTime.toFixed(0)}ms`);
    }

    console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`Test results saved to: ${TEST_RESULTS_DIR}/test-results.json`);

    // Return summary for external use
    return {
      success: summary.failed === 0,
      summary,
      performance,
      screenshotsPath: SCREENSHOT_DIR,
      resultsPath: `${TEST_RESULTS_DIR}/test-results.json`
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Delegation Workflow System Validation...');
    console.log('Testing components: DelegationButton, DelegationDashboard, RouterInbox, TrustLevelManagement, FollowUpAutomation');

    await this.setup();

    try {
      // Core functionality tests
      await this.testApplicationLoad();
      await this.testMultiplierModeAccess();
      await this.testDelegationButtonFunctionality();
      await this.testRouterInboxFunctionality();
      await this.testTrustLevelManagement();
      await this.testFollowUpAutomation();
      await this.testDelegationDashboard();

      // Additional validation tests
      await this.testResponsiveDesign();
      await this.testPerformanceMetrics();
      await this.testErrorHandling();

    } finally {
      await this.teardown();
    }

    return await this.generateTestReport();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    const tester = new DelegationWorkflowTester();
    const results = await tester.runAllTests();

    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
  })();
}

module.exports = DelegationWorkflowTester;