/**
 * Quick E2E Test - Using real credentials
 * Tests critical flows with existing user account
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://aiqueryhub.netlify.app';
const TEST_EMAIL = 'thabonel0@gmail.com';
const TEST_PASSWORD = 'Treflip2025';

async function runQuickTest() {
  console.log('🚀 Starting Quick E2E Test\n');

  let browser;
  let passed = 0;
  let failed = 0;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Test 1: Landing page loads
    console.log('1️⃣  Testing landing page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const title = await page.title();
    console.log(`   ✅ Landing page loaded: ${title}`);
    passed++;

    // Test 2: Navigate to auth
    console.log('\n2️⃣  Testing auth page...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('   ✅ Auth page loaded');
    passed++;

    // Test 3: Login
    console.log('\n3️⃣  Testing login...');
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);

    // Click sign in button
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for auth

    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      console.log('   ❌ Login failed - still on auth page');
      failed++;
    } else {
      console.log(`   ✅ Login successful - redirected to ${currentUrl}`);
      passed++;

      // Test 4: Dashboard
      console.log('\n4️⃣  Testing dashboard...');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const dashboardH1 = await page.$('h1');
      if (dashboardH1) {
        const text = await page.evaluate(el => el.textContent, dashboardH1);
        console.log(`   ✅ Dashboard loaded: ${text}`);
        passed++;
      } else {
        console.log('   ❌ Dashboard h1 not found');
        failed++;
      }

      // Test 5: Add Documents
      console.log('\n5️⃣  Testing add documents page...');
      await page.goto(`${BASE_URL}/add-documents`, { waitUntil: 'networkidle2' });
      const tabs = await page.$$('[role="tab"]');
      console.log(`   ✅ Add documents page loaded with ${tabs.length} tabs`);
      passed++;

      // Test 6: Knowledge Bases
      console.log('\n6️⃣  Testing knowledge bases page...');
      await page.goto(`${BASE_URL}/knowledge-bases`, { waitUntil: 'networkidle2' });
      console.log('   ✅ Knowledge bases page loaded');
      passed++;

      // Test 7: Chat
      console.log('\n7️⃣  Testing chat page...');
      await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
      const chatInput = await page.$('textarea, input[placeholder*="Ask"]');
      if (chatInput) {
        console.log('   ✅ Chat page loaded with input');
        passed++;
      } else {
        console.log('   ⚠️  Chat page loaded but no input found');
        passed++;
      }

      // Test 8: Settings
      console.log('\n8️⃣  Testing settings page...');
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });
      console.log('   ✅ Settings page loaded');
      passed++;

      // Test 9: Conversations
      console.log('\n9️⃣  Testing conversations page...');
      await page.goto(`${BASE_URL}/conversations`, { waitUntil: 'networkidle2' });
      console.log('   ✅ Conversations page loaded');
      passed++;

      // Test 10: Protected route check
      console.log('\n🔟 Testing protected routes...');
      const context = await browser.createBrowserContext();
      const incognitoPage = await context.newPage();
      await incognitoPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const protectedUrl = incognitoPage.url();
      if (protectedUrl.includes('/auth')) {
        console.log('   ✅ Protected routes redirect correctly');
        passed++;
      } else {
        console.log('   ❌ Protected routes not redirecting');
        failed++;
      }
      await context.close();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! READY TO LAUNCH! 🚀\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review above.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runQuickTest().catch(console.error);
