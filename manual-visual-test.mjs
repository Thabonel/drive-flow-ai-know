// Manual Visual Test for Enhanced Timeline Visualizations
import { chromium } from 'playwright';
import fs from 'fs';

async function manualVisualTest() {
  console.log('🧪 Starting Manual Visual Test for Enhanced Timeline...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down for visual inspection
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Navigate to timeline
    console.log('📍 Navigating to timeline...');
    await page.goto('http://localhost:8080/#/timeline');
    await page.waitForTimeout(3000);

    // Check for any enhanced visualization elements
    console.log('🔍 Checking for enhanced visualization components...');

    const visualizationCheck = await page.evaluate(() => {
      const results = {
        currentURL: window.location.href,
        timelineElements: {
          timelineManager: !!document.querySelector('.timeline-manager'),
          timelineCanvas: !!document.querySelector('.timeline-canvas'),
          timelineItems: document.querySelectorAll('.timeline-item').length,
          enhancedVisualization: !!document.querySelector('.enhanced-timeline-visualization'),
          attentionVisualization: !!document.querySelector('.attention-visualization'),
          decisionBatchVisualization: !!document.querySelector('.decision-batch-visualization'),
        },
        cssAnimations: {
          budgetViolationBlink: !!document.querySelector('.budget-violation-blink'),
          contextSwitchLine: !!document.querySelector('.context-switch-line'),
          peakHoursBackground: !!document.querySelector('.peak-hours-background'),
          animatedElements: document.querySelectorAll('[style*="animation"]').length,
        },
        attentionSystem: {
          attentionBudgetWidget: !!document.querySelector('.attention-budget-widget'),
          attentionPreferences: !!document.querySelector('[data-attention-preferences]'),
          roleBasedElements: document.querySelectorAll('[data-role]').length,
        },
        stylingPresent: {
          attentionEnhancementsCSS: false,
        }
      };

      // Check for attention enhancements CSS
      const stylesheets = Array.from(document.styleSheets);
      for (const sheet of stylesheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.cssText && rule.cssText.includes('budget-violation-blink')) {
              results.stylingPresent.attentionEnhancementsCSS = true;
              break;
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, ignore
        }
      }

      return results;
    });

    console.log('📊 Visual Check Results:');
    console.log(JSON.stringify(visualizationCheck, null, 2));

    // Take screenshot for manual inspection
    const screenshot = await page.screenshot({
      fullPage: true
    });

    if (!fs.existsSync('public/qa-evidence-enhanced-visualizations')) {
      fs.mkdirSync('public/qa-evidence-enhanced-visualizations', { recursive: true });
    }

    fs.writeFileSync('public/qa-evidence-enhanced-visualizations/manual-visual-test.png', screenshot);

    console.log('📸 Screenshot saved: manual-visual-test.png');

    // Wait for manual inspection
    console.log('⏸️  Pausing for manual inspection (press Enter to continue)...');

    // Check if running in automated mode
    if (process.argv.includes('--auto')) {
      await page.waitForTimeout(5000);
    } else {
      // In manual mode, keep browser open for inspection
      await page.waitForTimeout(30000); // 30 seconds for manual inspection
    }

    return visualizationCheck;

  } catch (error) {
    console.error('❌ Manual visual test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run test
manualVisualTest().then(results => {
  console.log('✅ Manual visual test completed');

  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    visualizationComponents: {
      enhancedTimelineVisualization: results.timelineElements.enhancedVisualization,
      attentionVisualization: results.timelineElements.attentionVisualization,
      decisionBatchVisualization: results.timelineElements.decisionBatchVisualization,
    },
    animationSystem: {
      cssAnimationsPresent: results.stylingPresent.attentionEnhancementsCSS,
      animatedElementsCount: results.cssAnimations.animatedElements,
      budgetViolationAnimations: results.cssAnimations.budgetViolationBlink,
      contextSwitchAnimations: results.cssAnimations.contextSwitchLine,
    },
    attentionSystemIntegration: {
      attentionBudgetWidget: results.attentionSystem.attentionBudgetWidget,
      roleBasedElements: results.attentionSystem.roleBasedElements,
    },
    timelineBasics: {
      timelineManagerPresent: results.timelineElements.timelineManager,
      timelineItemsCount: results.timelineElements.timelineItems,
    }
  };

  fs.writeFileSync(
    'public/qa-evidence-enhanced-visualizations/manual-visual-test-summary.json',
    JSON.stringify(summary, null, 2)
  );

  console.log('📋 Summary saved: manual-visual-test-summary.json');
}).catch(console.error);