// Debug Timeline Loading Issues
import { chromium } from 'playwright';
import fs from 'fs';

async function debugTimelineLoading() {
  console.log('🐛 Starting Timeline Loading Debug...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Enable console logging
    page.on('console', msg => {
      console.log('🖥️  Console:', msg.text());
    });

    // Enable error logging
    page.on('pageerror', error => {
      console.error('🚨 Page Error:', error.message);
    });

    // Enable failed request logging
    page.on('requestfailed', request => {
      console.error('🌐 Failed Request:', request.url(), request.failure()?.errorText);
    });

    console.log('📍 Navigating to root page first...');
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(2000);

    // Check what's on the root page
    const rootPageCheck = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        body: document.body.innerText.substring(0, 500),
        hasAuthForms: !!document.querySelector('form[data-auth]') || !!document.querySelector('.auth-form'),
        hasLoginButton: !!document.querySelector('button[type="submit"]'),
        hasTimeline: !!document.querySelector('.timeline'),
      };
    });

    console.log('🏠 Root Page Check:');
    console.log(JSON.stringify(rootPageCheck, null, 2));

    // Try to navigate to timeline directly
    console.log('📍 Attempting to navigate to timeline...');
    await page.goto('http://localhost:8080/#/timeline');
    await page.waitForTimeout(3000);

    // Check timeline page state
    const timelinePageCheck = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hash: window.location.hash,
        body: document.body.innerText.substring(0, 500),
        reactMounted: !!window.React,
        reactRootExists: !!document.querySelector('#root'),
        routingElements: document.querySelectorAll('[data-testid], [class*="route"], [class*="timeline"]').length,
        authElements: document.querySelectorAll('[class*="auth"], [data-auth]').length,
        errorElements: document.querySelectorAll('.error, [class*="error"]').length,
      };
    });

    console.log('📊 Timeline Page Check:');
    console.log(JSON.stringify(timelinePageCheck, null, 2));

    // Check network tab for any failed requests
    const networkRequests = await page.evaluate(() => {
      const performanceEntries = performance.getEntriesByType('navigation');
      return {
        navigationEntry: performanceEntries[0],
        loadEventEnd: performance.timing?.loadEventEnd,
        domContentLoaded: performance.timing?.domContentLoadedEventEnd,
      };
    });

    console.log('🌐 Network Check:');
    console.log(JSON.stringify(networkRequests, null, 2));

    // Take debug screenshot
    const screenshot = await page.screenshot({
      fullPage: true
    });

    if (!fs.existsSync('public/qa-evidence-enhanced-visualizations')) {
      fs.mkdirSync('public/qa-evidence-enhanced-visualizations', { recursive: true });
    }

    fs.writeFileSync('public/qa-evidence-enhanced-visualizations/debug-timeline.png', screenshot);

    console.log('📸 Debug screenshot saved');

    // Try to check if timeline components exist but are hidden
    const hiddenElementsCheck = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const hiddenTimelineElements = [];

      for (const element of allElements) {
        if (element.className.includes('timeline') ||
            element.className.includes('enhanced') ||
            element.className.includes('attention')) {
          const styles = window.getComputedStyle(element);
          hiddenTimelineElements.push({
            tagName: element.tagName,
            className: element.className,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            height: styles.height,
          });
        }
      }

      return {
        totalElements: allElements.length,
        hiddenTimelineElements,
        reactErrorBoundary: !!document.querySelector('[data-react-error-boundary]'),
      };
    });

    console.log('👁️  Hidden Elements Check:');
    console.log(JSON.stringify(hiddenElementsCheck, null, 2));

    return {
      rootPageCheck,
      timelinePageCheck,
      hiddenElementsCheck,
      networkRequests
    };

  } catch (error) {
    console.error('❌ Debug timeline loading failed:', error);
    throw error;
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for inspection
    await browser.close();
  }
}

// Run debug
debugTimelineLoading().then(results => {
  console.log('✅ Timeline loading debug completed');

  fs.writeFileSync(
    'public/qa-evidence-enhanced-visualizations/timeline-debug-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('📋 Debug results saved');
}).catch(console.error);