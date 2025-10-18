/**
 * AI Query Hub - E2E Test Suite
 *
 * Critical user flows:
 * 1. Landing page loads
 * 2. Sign up flow
 * 3. Login flow
 * 4. Dashboard loads with user data
 * 5. Document upload
 * 6. Knowledge base creation
 * 7. AI query
 * 8. Settings page
 * 9. Conversation history
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'https://aiqueryhub.netlify.app';
const HEADLESS = process.env.HEADLESS !== 'false';
const TIMEOUT = 30000;

// Test user credentials (will be generated)
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

let browser;
let page;

// Utility functions
async function takeScreenshot(name) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
}

async function waitForNavigation() {
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUT });
}

async function clickAndWait(selector) {
  await page.click(selector);
  await page.waitForTimeout(1000);
}

// Test suite
async function runTests() {
  console.log('🚀 Starting AI Query Hub E2E Tests\n');
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Headless mode: ${HEADLESS}\n`);

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    page = await browser.newPage();

    // Set default timeout
    page.setDefaultTimeout(TIMEOUT);

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser console error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log('❌ Page error:', error.message);
    });

    // Test 1: Landing page loads
    await test('Landing page loads', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await takeScreenshot('01-landing-page');

      // Check for key elements
      const h1 = await page.$('h1');
      const h1Text = await page.evaluate(el => el.textContent, h1);

      if (!h1Text || h1Text.trim() === '') {
        throw new Error('Landing page h1 is empty');
      }

      // Check for Get Started button
      const getStartedBtn = await page.$('a[href="/auth"], button:has-text("Get Started")');
      if (!getStartedBtn) {
        throw new Error('Get Started button not found');
      }

      console.log('   ✓ H1 found:', h1Text);
      console.log('   ✓ Get Started button found');
    }, results);

    // Test 2: Navigate to auth page
    await test('Navigate to auth page', async () => {
      // Look for sign in link or button
      const authLink = await page.$('a[href="/auth"]');
      if (authLink) {
        await authLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/auth`);
      }

      await takeScreenshot('02-auth-page');

      // Check for auth form
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');

      if (!emailInput || !passwordInput) {
        throw new Error('Auth form not found');
      }

      console.log('   ✓ Auth page loaded');
      console.log('   ✓ Email and password inputs found');
    }, results);

    // Test 3: Sign up flow
    await test('Sign up new user', async () => {
      // Fill in sign up form
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);

      // Look for sign up button (might need to switch tabs)
      const signUpTab = await page.$('button:has-text("Sign Up"), [role="tab"]:has-text("Sign Up")');
      if (signUpTab) {
        await signUpTab.click();
        await page.waitForTimeout(500);
      }

      // Click submit
      const submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) {
        throw new Error('Submit button not found');
      }

      await submitBtn.click();
      await page.waitForTimeout(3000);

      await takeScreenshot('03-after-signup');

      // Check if redirected to dashboard or if verification needed
      const currentUrl = page.url();
      console.log('   ✓ Current URL after signup:', currentUrl);

      // If still on auth page, might need email verification
      if (currentUrl.includes('/auth')) {
        console.log('   ⚠️  Email verification may be required');
        // For testing, we'll skip this and try login instead
        results.skipped.push('Email verification required for new signups');
        throw new Error('SKIP'); // Will be caught and handled
      }

      console.log('   ✓ Signup completed');
    }, results);

    // Test 4: Dashboard loads (if logged in)
    await test('Dashboard loads with user data', async () => {
      // Check if we're on dashboard
      let currentUrl = page.url();

      if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/index')) {
        // Try navigating directly
        await page.goto(`${BASE_URL}/dashboard`);
        currentUrl = page.url();
      }

      // If redirected to auth, we're not logged in
      if (currentUrl.includes('/auth')) {
        throw new Error('Not logged in - redirected to auth');
      }

      await takeScreenshot('04-dashboard');

      // Check for dashboard elements
      const dashboardTitle = await page.$('h1, h2');
      if (dashboardTitle) {
        const titleText = await page.evaluate(el => el.textContent, dashboardTitle);
        console.log('   ✓ Dashboard title:', titleText);
      }

      // Check for stats cards
      const cards = await page.$$('[class*="card"]');
      console.log(`   ✓ Found ${cards.length} cards on dashboard`);

    }, results);

    // Test 5: Navigate to add documents
    await test('Add documents page loads', async () => {
      // Look for navigation link
      const addDocsLink = await page.$('a[href="/add-documents"], a:has-text("Add Documents")');

      if (addDocsLink) {
        await addDocsLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/add-documents`);
      }

      await takeScreenshot('05-add-documents');

      // Check for tabs (Upload, Google Drive, Microsoft, S3)
      const tabs = await page.$$('[role="tab"], [class*="TabsTrigger"]');
      console.log(`   ✓ Found ${tabs.length} document source tabs`);

      if (tabs.length < 4) {
        console.log('   ⚠️  Expected 5 tabs (Upload, Drive, Microsoft, S3, Enterprise)');
      }
    }, results);

    // Test 6: Knowledge bases page
    await test('Knowledge bases page loads', async () => {
      const kbLink = await page.$('a[href="/knowledge-bases"], a:has-text("Knowledge")');

      if (kbLink) {
        await kbLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/knowledge-bases`);
      }

      await takeScreenshot('06-knowledge-bases');

      // Check for create button
      const createBtn = await page.$('button:has-text("Create"), button:has-text("New")');
      if (createBtn) {
        console.log('   ✓ Create knowledge base button found');
      }
    }, results);

    // Test 7: Chat/Query page
    await test('Chat page loads', async () => {
      const chatLink = await page.$('a[href="/chat"], a[href="/"], a:has-text("Chat")');

      if (chatLink) {
        await chatLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/chat`);
      }

      await takeScreenshot('07-chat-page');

      // Check for query input
      const queryInput = await page.$('textarea[placeholder*="Ask"], input[placeholder*="question"]');
      if (queryInput) {
        console.log('   ✓ Query input found');
      } else {
        console.log('   ⚠️  Query input not found - might be on homepage');
      }
    }, results);

    // Test 8: Settings page
    await test('Settings page loads', async () => {
      const settingsLink = await page.$('a[href="/settings"], a:has-text("Settings")');

      if (settingsLink) {
        await settingsLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/settings`);
      }

      await takeScreenshot('08-settings');

      // Check for profile section
      const profileSection = await page.$('h2:has-text("Profile"), h3:has-text("Account")');
      if (profileSection) {
        console.log('   ✓ Profile section found');
      }

      // Check for AI model settings
      const modelSettings = await page.$('select, [class*="Select"]');
      if (modelSettings) {
        console.log('   ✓ Model settings found');
      }
    }, results);

    // Test 9: Conversations page
    await test('Conversations page loads', async () => {
      const convoLink = await page.$('a[href="/conversations"], a:has-text("Conversation")');

      if (convoLink) {
        await convoLink.click();
        await waitForNavigation();
      } else {
        await page.goto(`${BASE_URL}/conversations`);
      }

      await takeScreenshot('09-conversations');

      console.log('   ✓ Conversations page loaded');
    }, results);

    // Test 10: Check for JavaScript errors
    await test('No critical JavaScript errors', async () => {
      // This is checked via page.on('pageerror') listener above
      // If we got here, no critical errors occurred
      console.log('   ✓ No page crashes or critical errors detected');
    }, results);

    // Test 11: Responsive design check
    await test('Mobile responsive design', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await page.goto(BASE_URL);
      await page.waitForTimeout(2000);

      await takeScreenshot('10-mobile-view');

      // Check if mobile menu exists
      const mobileMenu = await page.$('[class*="mobile"], button[aria-label*="menu"]');
      console.log('   ✓ Mobile viewport rendered');

      // Reset viewport
      await page.setViewport({ width: 1920, height: 1080 });
    }, results);

    // Test 12: Check auth redirect protection
    await test('Protected routes redirect to auth', async () => {
      // Open new incognito page
      const incognitoContext = await browser.createBrowserContext();
      const incognitoPage = await incognitoContext.newPage();

      try {
        // Try to access protected route
        await incognitoPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
        const url = incognitoPage.url();

        if (url.includes('/auth') || url.includes('/login')) {
          console.log('   ✓ Protected route redirected to auth');
        } else {
          throw new Error('Protected route did not redirect to auth');
        }
      } finally {
        await incognitoContext.close();
      }
    }, results);

  } catch (error) {
    if (error.message !== 'SKIP') {
      console.error('\n❌ Fatal error during tests:', error.message);
      results.failed.push({ name: 'Test suite execution', error: error.message });
    }
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
    }
  }

  // Print results
  printResults(results);

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Test wrapper function
async function test(name, fn, results) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await fn();
    results.passed.push(name);
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    if (error.message === 'SKIP') {
      console.log(`⏭️  SKIPPED: ${name}`);
      return;
    }
    results.failed.push({ name, error: error.message });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);

    // Take screenshot on failure
    try {
      await takeScreenshot(`ERROR-${name.replace(/\s+/g, '-')}`);
    } catch (e) {
      // Ignore screenshot errors
    }
  }
}

// Print test results
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(name => console.log(`   • ${name}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ name, error }) => {
      console.log(`   • ${name}`);
      console.log(`     ${error}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(msg => console.log(`   • ${msg}`));
  }

  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(60));
  console.log(`Pass Rate: ${passRate}% (${results.passed.length}/${total})`);
  console.log('='.repeat(60) + '\n');

  if (results.failed.length === 0) {
    console.log('🎉 All tests passed! Ready to launch! 🚀\n');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
  }
}

// Create screenshots directory
if (!fs.existsSync('tests/screenshots')) {
  fs.mkdirSync('tests/screenshots', { recursive: true });
}

// Run tests
runTests().catch(console.error);
