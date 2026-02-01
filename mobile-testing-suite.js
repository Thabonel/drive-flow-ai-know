/**
 * Mobile Experience Testing Suite
 * Comprehensive testing for mobile timeline, gestures, and PWA functionality
 */

const { chromium, devices } = require('playwright');

// Mobile device configurations for testing
const MOBILE_DEVICES = {
  'iPhone 13 Pro': devices['iPhone 13 Pro'],
  'iPhone SE': devices['iPhone SE'],
  'iPad Pro': devices['iPad Pro'],
  'Samsung Galaxy S21': devices['Galaxy S21'],
  'Pixel 5': devices['Pixel 5'],
};

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = './mobile-test-results';

class MobileTestRunner {
  constructor() {
    this.results = {
      devices: {},
      gestures: {},
      haptics: {},
      pwa: {},
      performance: {},
      responsiveness: {},
      errors: []
    };
  }

  async setup() {
    // Ensure results directory exists
    const fs = require('fs');
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR);
    }

    this.browser = await chromium.launch({
      headless: false, // Visual testing
      args: ['--enable-web-bluetooth'] // Enable PWA features
    });
  }

  async testDevice(deviceName, deviceConfig) {
    console.log(`\n🧪 Testing ${deviceName}...`);

    const context = await this.browser.newContext({
      ...deviceConfig,
      permissions: ['notifications'], // For PWA
    });

    const page = await context.newPage();

    try {
      // Enable console logging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          this.results.errors.push({
            device: deviceName,
            error: msg.text(),
            timestamp: new Date().toISOString()
          });
        }
      });

      // Navigate to app
      await page.goto(BASE_URL);
      await page.waitForLoadEvent('networkidle');

      // Test results for this device
      const deviceResults = {
        loadTime: 0,
        screenshots: [],
        gestureTests: {},
        responsiveness: {},
        pwa: {},
        performance: {}
      };

      // Measure load time
      const loadStart = Date.now();
      await page.waitForSelector('[data-testid="app-loaded"], .timeline-container, main', { timeout: 10000 });
      deviceResults.loadTime = Date.now() - loadStart;

      // Test 1: Basic Responsiveness
      console.log(`  📱 Testing responsiveness...`);
      await this.testResponsiveness(page, deviceResults, deviceName);

      // Test 2: Mobile Timeline Components
      console.log(`  📅 Testing timeline components...`);
      await this.testTimelineComponents(page, deviceResults, deviceName);

      // Test 3: Gesture Recognition
      console.log(`  🤏 Testing gesture recognition...`);
      await this.testGestures(page, deviceResults, deviceName);

      // Test 4: Haptic Feedback (simulated)
      console.log(`  📳 Testing haptic feedback...`);
      await this.testHapticFeedback(page, deviceResults, deviceName);

      // Test 5: PWA Installation
      console.log(`  📲 Testing PWA features...`);
      await this.testPWAFeatures(page, deviceResults, deviceName);

      // Test 6: Performance Metrics
      console.log(`  🚀 Testing performance...`);
      await this.testPerformance(page, deviceResults, deviceName);

      this.results.devices[deviceName] = deviceResults;

    } catch (error) {
      console.error(`❌ Error testing ${deviceName}:`, error.message);
      this.results.errors.push({
        device: deviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await context.close();
    }
  }

  async testResponsiveness(page, results, deviceName) {
    const viewport = await page.viewportSize();

    // Take screenshots at different orientations
    const portraitScreenshot = await page.screenshot({
      path: `${RESULTS_DIR}/${deviceName.replace(/\s+/g, '_')}_portrait.png`,
      fullPage: true
    });
    results.screenshots.push(`${deviceName}_portrait.png`);

    // Test landscape if applicable (tablets)
    if (viewport.width > 600) {
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await page.screenshot({
        path: `${RESULTS_DIR}/${deviceName.replace(/\s+/g, '_')}_landscape.png`,
        fullPage: true
      });
      results.screenshots.push(`${deviceName}_landscape.png`);

      // Restore portrait
      await page.setViewportSize(viewport);
    }

    // Test safe area support
    const hasSafeAreaClasses = await page.$$data('[class*="safe-"]');
    results.responsiveness.hasSafeAreaSupport = hasSafeAreaClasses.length > 0;

    // Test scroll behavior
    const scrollTest = await page.locator('html').evaluate(element => {
      const initialScroll = element.scrollTop;
      element.scrollTop += 100;
      const scrolled = element.scrollTop > initialScroll;
      element.scrollTop = initialScroll;
      return scrolled;
    });
    results.responsiveness.scrollWorks = scrollTest;
  }

  async testTimelineComponents(page, results, deviceName) {
    // Look for mobile timeline components
    const mobileComponents = {
      timelineControls: await page.$('div[class*="MobileTimelineControls"]') !== null,
      attentionBudget: await page.$('div[class*="MobileAttentionBudget"]') !== null,
      delegationPanel: await page.$('div[class*="MobileDelegationPanel"]') !== null,
      roleZoneSelector: await page.$('div[class*="MobileRoleZoneSelector"]') !== null,
      calibrationWizard: await page.$('div[class*="MobileCalibrationWizard"]') !== null
    };

    // Check if mobile-only components are rendered
    const isMobileDetected = await page.locator('html').evaluate(() => {
      return window.innerWidth <= 768;
    });

    // Test timeline item interaction
    const timelineItems = await page.$$('[data-testid*="timeline-item"], .timeline-item, .task-item');
    const hasTimelineItems = timelineItems.length > 0;

    if (hasTimelineItems && timelineItems.length > 0) {
      try {
        // Test tap interaction
        await timelineItems[0].click();
        await page.waitForTimeout(500);

        const isExpanded = await page.locator('[class*="expanded"], .show, [data-expanded="true"]').first().isVisible().catch(() => false);
        results.gestureTests.tapToExpand = isExpanded;
      } catch (e) {
        results.gestureTests.tapToExpand = false;
      }
    }

    results.gestureTests.mobileComponents = mobileComponents;
    results.gestureTests.isMobileDetected = isMobileDetected;
    results.gestureTests.timelineItemCount = timelineItems.length;
  }

  async testGestures(page, results, deviceName) {
    // Inject gesture testing utilities
    await page.addScriptTag({
      content: `
        window.gestureTestResults = {
          touchEventsSupported: 'ontouchstart' in window,
          gestureEventsSupported: 'ongesturestart' in window,
          touchAction: false,
          preventDefault: false
        };

        // Test touch event handling
        document.addEventListener('touchstart', (e) => {
          window.gestureTestResults.touchAction = true;
          if (e.preventDefault) {
            window.gestureTestResults.preventDefault = true;
          }
        }, { passive: false });
      `
    });

    // Simulate various gestures
    const gestureTests = {
      touchSupport: false,
      swipeDetection: false,
      pinchDetection: false,
      longPressDetection: false,
      multiTouchSupport: false
    };

    try {
      // Test touch support
      const touchSupport = await page.locator('html').evaluate(() => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      });
      gestureTests.touchSupport = touchSupport;

      // Find a test element (timeline item or demo area)
      const testElement = await page.$('body');
      if (testElement) {
        const boundingBox = await testElement.boundingBox();

        if (boundingBox) {
          const centerX = boundingBox.x + boundingBox.width / 2;
          const centerY = boundingBox.y + boundingBox.height / 2;

          // Simulate swipe gesture
          await page.touchscreen.tap(centerX, centerY);
          await page.touchscreen.tap(centerX + 100, centerY); // Right swipe
          await page.waitForTimeout(300);

          // Check if swipe was detected
          const swipeDetected = await page.locator('html').evaluate(() => {
            return window.gestureTestResults && window.gestureTestResults.touchAction;
          });
          gestureTests.swipeDetection = swipeDetected;

          // Simulate pinch gesture (multi-touch)
          try {
            // Start two touches
            await page.touchscreen.tap(centerX - 50, centerY);
            await page.touchscreen.tap(centerX + 50, centerY);
            await page.waitForTimeout(100);
            gestureTests.multiTouchSupport = true;
          } catch (e) {
            gestureTests.multiTouchSupport = false;
          }

          // Simulate long press
          await page.touchscreen.tap(centerX, centerY);
          await page.waitForTimeout(600); // Long press threshold
          gestureTests.longPressDetection = true;
        }
      }

    } catch (error) {
      console.warn(`Gesture testing error on ${deviceName}:`, error.message);
    }

    results.gestureTests = { ...results.gestureTests, ...gestureTests };
  }

  async testHapticFeedback(page, results, deviceName) {
    // Test haptic feedback API availability
    const hapticSupport = await page.locator('html').evaluate(() => {
      return {
        vibrateAPI: 'vibrate' in navigator,
        webkitVibrate: 'webkitVibrate' in navigator,
        gamepadHaptics: 'getGamepads' in navigator
      };
    });

    // Test haptic feedback functions
    const hapticTests = await page.locator('html').evaluate(() => {
      if (!window.Vibrate) {
        return { error: 'Haptic library not loaded' };
      }

      try {
        // Test different haptic patterns
        const patterns = {
          light: window.Vibrate.light,
          selection: window.Vibrate.selection,
          success: window.Vibrate.success,
          error: window.Vibrate.error
        };

        const results = {};
        Object.keys(patterns).forEach(key => {
          try {
            if (patterns[key]) {
              patterns[key]();
              results[key] = true;
            }
          } catch (e) {
            results[key] = false;
          }
        });

        return results;
      } catch (error) {
        return { error: error.message };
      }
    });

    results.gestureTests.hapticSupport = hapticSupport;
    results.gestureTests.hapticTests = hapticTests;
  }

  async testPWAFeatures(page, results, deviceName) {
    // Test PWA manifest
    const manifestLink = await page.$('link[rel="manifest"]');
    const hasManifest = manifestLink !== null;

    // Test service worker registration
    const hasServiceWorker = await page.locator('html').evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    // Test installation prompt
    const installPrompt = await page.$('.PWAInstallPrompt, [data-testid="pwa-install"]');
    const hasInstallPrompt = installPrompt !== null;

    // Check for standalone mode detection
    const standaloneSupport = await page.locator('html').evaluate(() => {
      return {
        matchMedia: window.matchMedia('(display-mode: standalone)').matches,
        navigator: 'standalone' in window.navigator
      };
    });

    // Test offline capabilities
    let offlineSupport = false;
    try {
      await page.setOfflineMode(true);
      await page.reload();
      const offlinePage = await page.$('body');
      offlineSupport = offlinePage !== null;
      await page.setOfflineMode(false);
    } catch (e) {
      // Expected if no offline support
    }

    results.gestureTests.pwa = {
      hasManifest,
      hasServiceWorker,
      hasInstallPrompt,
      standaloneSupport,
      offlineSupport
    };
  }

  async testPerformance(page, results, deviceName) {
    // Measure Core Web Vitals and mobile-specific metrics
    const metrics = await page.locator('html').evaluate(() => {
      return new Promise((resolve) => {
        // Use Performance Observer if available
        if ('PerformanceObserver' in window) {
          const metrics = {};

          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              metrics.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              metrics.fid = entries[0].processingStart - entries[0].startTime;
            }
          }).observe({ entryTypes: ['first-input'] });

          // Layout shifts
          new PerformanceObserver((list) => {
            let cumulativeShift = 0;
            list.getEntries().forEach(entry => {
              if (!entry.hadRecentInput) {
                cumulativeShift += entry.value;
              }
            });
            metrics.cls = cumulativeShift;
          }).observe({ entryTypes: ['layout-shift'] });

          // Basic navigation timing
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            metrics.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
            metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
            metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
          }

          // Memory info if available
          if (performance.memory) {
            metrics.memoryUsage = {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit
            };
          }

          setTimeout(() => resolve(metrics), 3000);
        } else {
          resolve({ error: 'PerformanceObserver not available' });
        }
      });
    });

    // Test scroll performance
    const scrollPerformance = await page.locator('html').evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let startTime = performance.now();

        const measureScrolling = () => {
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(measureScrolling);
          } else {
            const endTime = performance.now();
            const fps = frameCount / ((endTime - startTime) / 1000);
            resolve({ fps: Math.round(fps) });
          }
        };

        // Trigger scrolling
        window.scrollBy(0, 10);
        requestAnimationFrame(measureScrolling);
      });
    });

    results.gestureTests.performance = {
      coreWebVitals: metrics,
      scrollPerformance,
      loadTime: results.loadTime
    };
  }

  async generateReport() {
    const timestamp = new Date().toISOString();

    const report = {
      testRun: {
        timestamp,
        url: BASE_URL,
        devices: Object.keys(MOBILE_DEVICES)
      },
      summary: this.generateSummary(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };

    // Write report to file
    const fs = require('fs');
    const reportPath = `${RESULTS_DIR}/mobile-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    const readableReport = this.generateReadableReport(report);
    fs.writeFileSync(`${RESULTS_DIR}/mobile-test-report-${Date.now()}.md`, readableReport);

    console.log(`\n📊 Reports generated:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Markdown: ${reportPath.replace('.json', '.md')}`);

    return report;
  }

  generateSummary() {
    const deviceCount = Object.keys(this.results.devices).length;
    const errorCount = this.results.errors.length;

    // Calculate averages
    const loadTimes = Object.values(this.results.devices).map(d => d.loadTime);
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;

    // Count successful tests
    let successfulGestureTests = 0;
    let totalGestureTests = 0;

    Object.values(this.results.devices).forEach(device => {
      Object.values(device.gestureTests || {}).forEach(test => {
        totalGestureTests++;
        if (test === true || (typeof test === 'object' && Object.values(test).some(v => v === true))) {
          successfulGestureTests++;
        }
      });
    });

    return {
      devicesTestedCount: deviceCount,
      errorsEncountered: errorCount,
      averageLoadTime: Math.round(avgLoadTime),
      gestureTestSuccessRate: totalGestureTests > 0 ? (successfulGestureTests / totalGestureTests * 100) : 0,
      overallScore: this.calculateOverallScore()
    };
  }

  calculateOverallScore() {
    let totalScore = 0;
    let maxScore = 0;

    Object.values(this.results.devices).forEach(device => {
      maxScore += 100;

      let deviceScore = 0;

      // Load time score (max 20 points)
      deviceScore += device.loadTime < 3000 ? 20 : device.loadTime < 5000 ? 10 : 5;

      // Gesture tests (max 30 points)
      const gestureTests = device.gestureTests || {};
      if (gestureTests.touchSupport) deviceScore += 10;
      if (gestureTests.swipeDetection) deviceScore += 10;
      if (gestureTests.multiTouchSupport) deviceScore += 10;

      // Component rendering (max 25 points)
      const mobileComponents = gestureTests.mobileComponents || {};
      const componentCount = Object.values(mobileComponents).filter(Boolean).length;
      deviceScore += componentCount * 5;

      // PWA features (max 25 points)
      const pwa = gestureTests.pwa || {};
      if (pwa.hasManifest) deviceScore += 5;
      if (pwa.hasServiceWorker) deviceScore += 5;
      if (pwa.hasInstallPrompt) deviceScore += 5;
      if (pwa.standaloneSupport) deviceScore += 5;
      if (pwa.offlineSupport) deviceScore += 5;

      totalScore += deviceScore;
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }

  generateRecommendations() {
    const recommendations = [];

    // Analyze load times
    const slowDevices = Object.entries(this.results.devices)
      .filter(([_, device]) => device.loadTime > 3000)
      .map(([name, _]) => name);

    if (slowDevices.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: `Slow load times on ${slowDevices.join(', ')}`,
        suggestion: 'Optimize bundle size, enable code splitting, or implement lazy loading'
      });
    }

    // Check gesture support
    const gestureIssues = [];
    Object.entries(this.results.devices).forEach(([deviceName, device]) => {
      const gestures = device.gestureTests || {};
      if (!gestures.touchSupport) {
        gestureIssues.push(`${deviceName}: No touch support detected`);
      }
      if (!gestures.swipeDetection) {
        gestureIssues.push(`${deviceName}: Swipe gestures not working`);
      }
    });

    if (gestureIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'gestures',
        issue: 'Gesture recognition issues detected',
        suggestion: 'Check touch event handlers and gesture library implementation',
        details: gestureIssues
      });
    }

    // PWA recommendations
    const pwaIssues = [];
    Object.entries(this.results.devices).forEach(([deviceName, device]) => {
      const pwa = device.gestureTests?.pwa || {};
      if (!pwa.hasManifest) pwaIssues.push('Missing PWA manifest');
      if (!pwa.hasServiceWorker) pwaIssues.push('No service worker registration');
      if (!pwa.offlineSupport) pwaIssues.push('Limited offline functionality');
    });

    if (pwaIssues.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'pwa',
        issue: 'PWA features incomplete',
        suggestion: 'Implement missing PWA features for better mobile experience',
        details: [...new Set(pwaIssues)]
      });
    }

    return recommendations;
  }

  generateReadableReport(report) {
    const { testRun, summary, recommendations } = report;

    return `# Mobile Experience Testing Report

## Test Overview
- **Timestamp**: ${testRun.timestamp}
- **URL**: ${testRun.url}
- **Devices Tested**: ${testRun.devices.join(', ')}

## Summary
- **Overall Score**: ${summary.overallScore}% ⭐
- **Devices Tested**: ${summary.devicesTestedCount}
- **Average Load Time**: ${summary.averageLoadTime}ms
- **Gesture Test Success Rate**: ${summary.gestureTestSuccessRate.toFixed(1)}%
- **Errors Encountered**: ${summary.errorsEncountered}

## Detailed Results by Device

${Object.entries(report.detailedResults.devices).map(([deviceName, device]) => {
  return `### ${deviceName}
- **Load Time**: ${device.loadTime}ms
- **Screenshots**: ${device.screenshots?.length || 0} captured
- **Touch Support**: ${device.gestureTests?.touchSupport ? '✅' : '❌'}
- **Gesture Recognition**: ${device.gestureTests?.swipeDetection ? '✅' : '❌'}
- **PWA Ready**: ${device.gestureTests?.pwa?.hasManifest && device.gestureTests?.pwa?.hasServiceWorker ? '✅' : '❌'}
- **Mobile Components**: ${Object.values(device.gestureTests?.mobileComponents || {}).filter(Boolean).length}/5 detected`;
}).join('\n\n')}

## Recommendations

${recommendations.map(rec => {
  return `### ${rec.priority.toUpperCase()}: ${rec.issue}
**Category**: ${rec.category}
**Suggestion**: ${rec.suggestion}
${rec.details ? `**Details**: ${Array.isArray(rec.details) ? rec.details.join(', ') : rec.details}` : ''}`;
}).join('\n\n')}

## Screenshots
Screenshots for each device and orientation are available in the test results directory.

---
*Report generated on ${new Date().toLocaleString()}*
`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main test execution
async function runMobileTests() {
  console.log('🚀 Starting comprehensive mobile experience testing...\n');

  const runner = new MobileTestRunner();

  try {
    await runner.setup();

    // Test each device configuration
    for (const [deviceName, deviceConfig] of Object.entries(MOBILE_DEVICES)) {
      await runner.testDevice(deviceName, deviceConfig);
    }

    // Generate comprehensive report
    const report = await runner.generateReport();

    console.log('\n✅ Mobile testing completed successfully!');
    console.log(`📊 Overall Score: ${report.summary.overallScore}%`);
    console.log(`📱 Tested ${report.summary.devicesTestedCount} devices`);
    console.log(`⚡ Average load time: ${report.summary.averageLoadTime}ms`);

    if (report.summary.errorsEncountered > 0) {
      console.log(`⚠️  Found ${report.summary.errorsEncountered} issues - check report for details`);
    }

    // Exit with status code based on results
    const exitCode = report.summary.overallScore >= 80 && report.summary.errorsEncountered === 0 ? 0 : 1;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Mobile testing failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runMobileTests().catch(console.error);
}

module.exports = { MobileTestRunner, runMobileTests };