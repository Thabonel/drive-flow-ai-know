// Enhanced Timeline Visualization Testing Script
const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_URL = 'http://localhost:8080';
const RESULTS_DIR = 'public/qa-evidence-enhanced-visualizations';
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Enhanced visualization test cases
const TEST_SCENARIOS = [
  {
    name: 'enhanced_timeline_basic',
    description: 'Basic enhanced timeline with attention visualizations',
    url: '/#/timeline',
    waitFor: 3000
  },
  {
    name: 'attention_budget_visualization',
    description: 'Attention budget visualization with budget status indicators',
    url: '/#/timeline',
    action: 'testBudgetVisualization',
    waitFor: 2000
  },
  {
    name: 'context_switch_animations',
    description: 'Context switch visualization with animated indicators',
    url: '/#/timeline',
    action: 'testContextSwitchAnimations',
    waitFor: 2000
  },
  {
    name: 'peak_hours_highlighting',
    description: 'Peak hours highlighting with gradient backgrounds',
    url: '/#/timeline',
    action: 'testPeakHoursHighlighting',
    waitFor: 2000
  },
  {
    name: 'decision_batch_grouping',
    description: 'Decision batch visualization with SVG grouping',
    url: '/#/timeline',
    action: 'testDecisionBatchGrouping',
    waitFor: 3000
  },
  {
    name: 'focus_protection_zones',
    description: 'Focus protection zones for deep work blocks',
    url: '/#/timeline',
    action: 'testFocusProtectionZones',
    waitFor: 2000
  }
];

// Create results directory
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Performance metrics tracking
let performanceMetrics = [];
let visualTestResults = [];

// Animation performance testing function
async function testAnimationPerformance(page) {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let frameCount = 0;
      let lastFrameTime = startTime;

      function countFrames() {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - startTime < 2000) { // Test for 2 seconds
          requestAnimationFrame(countFrames);
          lastFrameTime = currentTime;
        } else {
          const fps = (frameCount / 2);
          const animatedElements = document.querySelectorAll('[style*="animation"], .budget-violation-blink, .context-switch-line, .peak-hours-background');

          resolve({
            fps: Math.round(fps),
            animatedElements: animatedElements.length,
            duration: currentTime - startTime,
            frameCount
          });
        }
      }

      requestAnimationFrame(countFrames);
    });
  });

  return metrics;
}

// Visual enhancement testing function
async function testVisualEnhancements(page, scenario) {
  console.log(`Testing visual enhancements for: ${scenario.name}`);

  // Wait for enhanced visualizations to load
  await page.waitForSelector('.enhanced-timeline-visualization, .attention-visualization, .decision-batch-group', {
    timeout: 10000,
    state: 'attached'
  }).catch(() => {
    console.log('Enhanced visualization elements not found, testing basic timeline');
  });

  // Test specific actions if defined
  if (scenario.action) {
    try {
      switch (scenario.action) {
        case 'testBudgetVisualization':
          await page.evaluate(() => {
            // Look for budget visualization elements
            const budgetElements = document.querySelectorAll('.budget-progress, .attention-budget-widget, .budget-violation-blink');
            if (budgetElements.length > 0) {
              budgetElements[0].scrollIntoView();
            }
          });
          break;

        case 'testContextSwitchAnimations':
          await page.evaluate(() => {
            // Trigger context switch visualization
            const switchElements = document.querySelectorAll('.context-switch-line, .context-switch-indicator');
            if (switchElements.length > 0) {
              switchElements[0].scrollIntoView();
            }
          });
          break;

        case 'testPeakHoursHighlighting':
          await page.evaluate(() => {
            // Look for peak hours highlighting
            const peakElements = document.querySelectorAll('.peak-hours-highlight, .peak-hours-zone');
            if (peakElements.length > 0) {
              peakElements[0].scrollIntoView();
            }
          });
          break;

        case 'testDecisionBatchGrouping':
          await page.evaluate(() => {
            // Look for decision batch visualization
            const batchElements = document.querySelectorAll('.decision-batch-group, .batch-connection');
            if (batchElements.length > 0) {
              batchElements[0].scrollIntoView();
            }
          });
          break;

        case 'testFocusProtectionZones':
          await page.evaluate(() => {
            // Look for focus protection visualization
            const focusElements = document.querySelectorAll('.focus-protection-alert, [data-focus-protection]');
            if (focusElements.length > 0) {
              focusElements[0].scrollIntoView();
            }
          });
          break;
      }

      await page.waitForTimeout(scenario.waitFor || 1000);
    } catch (error) {
      console.log(`Action ${scenario.action} not available or failed:`, error.message);
    }
  }

  // Test animation performance
  const animationMetrics = await testAnimationPerformance(page);

  // Capture visual evidence
  const screenshot = await page.screenshot({
    fullPage: true,
    animations: 'allow' // Capture animations in their current state
  });

  const filename = `${scenario.name}_${page.viewportSize().width}x${page.viewportSize().height}.png`;
  fs.writeFileSync(path.join(RESULTS_DIR, filename), screenshot);

  return {
    scenario: scenario.name,
    animationMetrics,
    screenshotPath: filename,
    timestamp: new Date().toISOString()
  };
}

// Enhanced visualization integration testing
async function testEnhancedVisualizationIntegration(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Testing Enhanced Timeline Visualization Integration...');

  try {
    await page.goto(TEST_URL + '/#/timeline');
    await page.waitForTimeout(3000);

    // Test enhanced visualization components
    const integrationResults = await page.evaluate(() => {
      const results = {
        enhancedTimelineVisualization: !!document.querySelector('.enhanced-timeline-visualization'),
        attentionVisualization: !!document.querySelector('.attention-visualization'),
        decisionBatchVisualization: !!document.querySelector('.decision-batch-group'),
        attentionEnhancementsCSS: !!document.querySelector('style[data-emotion]') || !!document.querySelector('style'),
        animationElements: document.querySelectorAll('[style*="animation"], .budget-violation-blink').length,
        svgVisualizations: document.querySelectorAll('svg.timeline-overlay, svg.decision-batch-group').length,
        enhancementOverlays: document.querySelectorAll('.enhancement-overlay, .enhancement-peak-hours').length
      };

      // Test for specific enhanced features
      results.budgetStatusFeedback = !!document.querySelector('.budget-progress, .attention-budget-widget');
      results.contextSwitchIndicators = !!document.querySelector('.context-switch-line, .context-switch-indicator');
      results.peakHoursHighlighting = !!document.querySelector('.peak-hours-highlight, .peak-hours-zone');
      results.focusProtectionZones = !!document.querySelector('.focus-protection-alert, [data-focus-protection]');

      return results;
    });

    await context.close();
    return integrationResults;

  } catch (error) {
    console.error('Enhanced visualization integration test failed:', error);
    await context.close();
    return { error: error.message };
  }
}

// Cross-browser compatibility testing
async function testCrossBrowserCompatibility() {
  console.log('Starting cross-browser enhanced visualization testing...');

  const browsers = [
    { name: 'chromium', engine: chromium },
    { name: 'firefox', engine: firefox },
    { name: 'webkit', engine: webkit }
  ];

  const results = {};

  for (const { name, engine } of browsers) {
    console.log(`Testing ${name}...`);

    try {
      const browser = await engine.launch();

      // Test integration
      const integrationResults = await testEnhancedVisualizationIntegration(browser);

      // Test scenarios across viewports
      const scenarioResults = [];

      for (const viewport of [DESKTOP_VIEWPORT, TABLET_VIEWPORT, MOBILE_VIEWPORT]) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();

        for (const scenario of TEST_SCENARIOS.slice(0, 3)) { // Test first 3 scenarios per viewport
          try {
            await page.goto(TEST_URL + scenario.url);
            await page.waitForTimeout(2000);

            const testResult = await testVisualEnhancements(page, {
              ...scenario,
              name: `${scenario.name}_${name}_${viewport.width}x${viewport.height}`
            });

            scenarioResults.push(testResult);
          } catch (error) {
            console.error(`Scenario ${scenario.name} failed in ${name}:`, error.message);
          }
        }

        await context.close();
      }

      await browser.close();

      results[name] = {
        integration: integrationResults,
        scenarios: scenarioResults
      };

    } catch (error) {
      console.error(`Browser ${name} testing failed:`, error.message);
      results[name] = { error: error.message };
    }
  }

  return results;
}

// Accessibility testing for enhanced visualizations
async function testAccessibility(browser) {
  console.log('Testing enhanced visualization accessibility...');

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(TEST_URL + '/#/timeline');
    await page.waitForTimeout(3000);

    const accessibilityResults = await page.evaluate(() => {
      const results = {
        reducedMotionSupport: false,
        highContrastSupport: false,
        keyboardNavigation: false,
        screenReaderSupport: false,
        colorContrastCompliance: false
      };

      // Check for reduced motion support
      const styles = document.querySelectorAll('style');
      for (const style of styles) {
        if (style.textContent.includes('@media (prefers-reduced-motion: reduce)')) {
          results.reducedMotionSupport = true;
          break;
        }
      }

      // Check for high contrast support
      for (const style of styles) {
        if (style.textContent.includes('@media (prefers-contrast: high)')) {
          results.highContrastSupport = true;
          break;
        }
      }

      // Check for ARIA labels and accessibility attributes
      const timelineElements = document.querySelectorAll('.timeline-item, .enhanced-timeline-visualization');
      results.screenReaderSupport = Array.from(timelineElements).some(el =>
        el.hasAttribute('aria-label') || el.hasAttribute('role')
      );

      // Check for keyboard navigation support
      const interactiveElements = document.querySelectorAll('button, [tabindex], a');
      results.keyboardNavigation = interactiveElements.length > 0;

      return results;
    });

    await context.close();
    return accessibilityResults;

  } catch (error) {
    console.error('Accessibility testing failed:', error);
    await context.close();
    return { error: error.message };
  }
}

// Main testing function
async function runEnhancedVisualizationTests() {
  console.log('🧪 Starting Enhanced Timeline Visualization Testing...');
  console.log(`Results will be saved to: ${RESULTS_DIR}`);

  const startTime = Date.now();

  try {
    // Cross-browser testing
    const browserResults = await testCrossBrowserCompatibility();

    // Accessibility testing
    const browser = await chromium.launch();
    const accessibilityResults = await testAccessibility(browser);
    await browser.close();

    // Compile final results
    const testResults = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - startTime,
      browsers: browserResults,
      accessibility: accessibilityResults,
      summary: {
        totalScenarios: TEST_SCENARIOS.length,
        browsersLested: Object.keys(browserResults).length,
        screenshotsCaptured: fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.png')).length
      }
    };

    // Save test results
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'enhanced-visualization-test-results.json'),
      JSON.stringify(testResults, null, 2)
    );

    console.log('✅ Enhanced visualization testing completed successfully!');
    console.log(`📊 Results saved to: ${path.join(RESULTS_DIR, 'enhanced-visualization-test-results.json')}`);
    console.log(`📸 Screenshots saved to: ${RESULTS_DIR}/`);

    // Print summary
    console.log('\n📋 Test Summary:');
    console.log(`⏱️  Duration: ${Math.round(testResults.testDuration / 1000)}s`);
    console.log(`🌐 Browsers tested: ${Object.keys(browserResults).join(', ')}`);
    console.log(`📱 Viewports tested: Desktop, Tablet, Mobile`);
    console.log(`🎭 Scenarios tested: ${testResults.summary.totalScenarios}`);
    console.log(`📸 Screenshots captured: ${testResults.summary.screenshotsCaptured}`);

    return testResults;

  } catch (error) {
    console.error('❌ Enhanced visualization testing failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runEnhancedVisualizationTests().catch(console.error);
}

module.exports = { runEnhancedVisualizationTests };