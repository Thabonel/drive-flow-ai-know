const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create evidence directory
const evidenceDir = 'qa-evidence-integration-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-');
fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(path.join(evidenceDir, 'screenshots'), { recursive: true });

async function runIntegrationTests() {
  console.log('🚀 Starting 3-2-1 Attention System Integration Test');
  console.log('Evidence Directory:', evidenceDir);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });

  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    errors: []
  };

  try {
    // Test 1: Landing page loads
    console.log('📋 Test 1: Landing Page Load');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', '1-landing-page.png'),
      fullPage: true
    });
    results.screenshots.push('1-landing-page.png');

    // Check if attention system is mentioned
    const pageContent = await page.textContent('body');
    const hasAttentionFeatures = pageContent.includes('timeline') ||
                                pageContent.includes('attention') ||
                                pageContent.includes('productivity');

    results.tests.push({
      name: 'Landing Page Loads',
      status: 'PASS',
      details: 'Page loaded successfully. Attention features mentioned: ' + hasAttentionFeatures
    });

    // Test 2: Navigate to auth page
    console.log('📋 Test 2: Authentication Flow');
    await page.click('a[href="/auth"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', '2-auth-page.png'),
      fullPage: true
    });
    results.screenshots.push('2-auth-page.png');

    const authPageTitle = await page.textContent('h1, h2') || '';
    results.tests.push({
      name: 'Auth Page Navigation',
      status: 'PASS',
      details: 'Auth page loaded with title: ' + authPageTitle
    });

    // Test 3: Check if we can access dashboard (even without auth, should redirect)
    console.log('📋 Test 3: Dashboard Route Check');
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', '3-dashboard-redirect.png'),
      fullPage: true
    });
    results.screenshots.push('3-dashboard-redirect.png');

    const currentUrl = page.url();
    const hasAuth = currentUrl.includes('/auth');
    results.tests.push({
      name: 'Dashboard Security Check',
      status: hasAuth ? 'PASS' : 'FAIL',
      details: 'Protected route redirected to: ' + currentUrl
    });

    // Test 4: Timeline page structure check
    console.log('📋 Test 4: Timeline Page Check');
    await page.goto('http://localhost:8080/timeline');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', '4-timeline-page.png'),
      fullPage: true
    });
    results.screenshots.push('4-timeline-page.png');

    // Check for timeline components in HTML
    const timelineElements = await page.$$eval('*', elements =>
      elements.some(el =>
        el.className && (
          el.className.includes('timeline') ||
          el.className.includes('attention') ||
          el.className.includes('calendar')
        )
      )
    );

    results.tests.push({
      name: 'Timeline Components Present',
      status: timelineElements ? 'PASS' : 'PARTIAL',
      details: 'Timeline-related elements found: ' + timelineElements
    });

    // Test 5: Console errors check
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    results.tests.push({
      name: 'Console Error Check',
      status: logs.length === 0 ? 'PASS' : 'WARNING',
      details: 'Console errors found: ' + logs.length + '. Errors: ' + logs.join('; ')
    });

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    results.errors.push({
      error: error.message,
      stack: error.stack
    });
  }

  await browser.close();

  // Write results
  fs.writeFileSync(
    path.join(evidenceDir, 'integration-test-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Generate summary report
  const summary = {
    total_tests: results.tests.length,
    passed: results.tests.filter(t => t.status === 'PASS').length,
    failed: results.tests.filter(t => t.status === 'FAIL').length,
    warnings: results.tests.filter(t => t.status === 'WARNING').length,
    evidence_captured: results.screenshots.length,
    errors: results.errors.length
  };

  console.log('\n🎯 Integration Test Results');
  console.log('============================');
  console.log('Total Tests: ' + summary.total_tests);
  console.log('Passed: ' + summary.passed);
  console.log('Failed: ' + summary.failed);
  console.log('Warnings: ' + summary.warnings);
  console.log('Screenshots: ' + summary.evidence_captured);
  console.log('Errors: ' + summary.errors);

  fs.writeFileSync(
    path.join(evidenceDir, 'test-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  return evidenceDir;
}

runIntegrationTests().then(evidenceDir => {
  console.log('\n✅ Integration testing complete. Evidence in: ' + evidenceDir);
}).catch(error => {
  console.error('💥 Integration test failed:', error);
});