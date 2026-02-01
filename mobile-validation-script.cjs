/**
 * Mobile Experience Validation Script
 * Automated testing and analysis of mobile timeline functionality
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = './mobile-test-results';

class MobileExperienceValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      architecture: {},
      components: {},
      gestures: {},
      haptics: {},
      pwa: {},
      performance: {},
      accessibility: {},
      recommendations: []
    };
  }

  // Analyze mobile component architecture
  analyzeArchitecture() {
    console.log('📱 Analyzing mobile component architecture...');

    const mobileComponentsDir = './src/components/timeline/mobile/';
    const gesturesFile = './src/hooks/useGestures.ts';
    const hapticsFile = './src/lib/haptics.ts';

    // Count and analyze mobile components
    let mobileComponents = [];
    if (fs.existsSync(mobileComponentsDir)) {
      mobileComponents = fs.readdirSync(mobileComponentsDir)
        .filter(file => file.endsWith('.tsx'))
        .map(file => file.replace('.tsx', ''));
    }

    // Analyze gesture system
    let gestureFeatures = [];
    if (fs.existsSync(gesturesFile)) {
      const gestureContent = fs.readFileSync(gesturesFile, 'utf8');
      gestureFeatures = [
        { name: 'Swipe Detection', supported: gestureContent.includes('swipe') },
        { name: 'Long Press', supported: gestureContent.includes('longpress') },
        { name: 'Pinch/Zoom', supported: gestureContent.includes('pinch') },
        { name: 'Multi-touch', supported: gestureContent.includes('touches.length') },
        { name: 'Velocity Tracking', supported: gestureContent.includes('velocity') },
        { name: 'Direction Detection', supported: gestureContent.includes('direction') }
      ];
    }

    // Analyze haptic system
    let hapticFeatures = [];
    if (fs.existsSync(hapticsFile)) {
      const hapticContent = fs.readFileSync(hapticsFile, 'utf8');
      hapticFeatures = [
        { name: 'Vibration API', supported: hapticContent.includes('navigator.vibrate') },
        { name: 'Pattern Variations', supported: hapticContent.includes('light') && hapticContent.includes('heavy') },
        { name: 'Success Feedback', supported: hapticContent.includes('success') },
        { name: 'Error Feedback', supported: hapticContent.includes('error') },
        { name: 'Custom Patterns', supported: hapticContent.includes('custom') }
      ];
    }

    this.results.architecture = {
      mobileComponents: {
        count: mobileComponents.length,
        components: mobileComponents,
        expectedComponents: [
          'MobileTimelineControls',
          'MobileAttentionBudget',
          'MobileDelegationPanel',
          'MobileRoleZoneSelector',
          'MobileCalibrationWizard'
        ]
      },
      gestureSystem: {
        features: gestureFeatures,
        completeness: gestureFeatures.filter(f => f.supported).length / gestureFeatures.length * 100
      },
      hapticSystem: {
        features: hapticFeatures,
        completeness: hapticFeatures.filter(f => f.supported).length / hapticFeatures.length * 100
      }
    };
  }

  // Test PWA features
  testPWAFeatures() {
    console.log('📲 Testing PWA features...');

    const manifestFile = './public/manifest.json';
    const serviceWorkerFile = './public/sw.js';
    const iconsDir = './public/';

    let pwaScore = 0;
    const pwaFeatures = [];

    // Check manifest
    if (fs.existsSync(manifestFile)) {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      const manifestFeatures = [
        { name: 'Manifest File', score: 15, check: () => true },
        { name: 'App Name', score: 5, check: () => manifest.name && manifest.short_name },
        { name: 'Icons', score: 15, check: () => manifest.icons && manifest.icons.length >= 2 },
        { name: 'Start URL', score: 5, check: () => manifest.start_url },
        { name: 'Display Mode', score: 10, check: () => manifest.display === 'standalone' },
        { name: 'Theme Colors', score: 5, check: () => manifest.theme_color && manifest.background_color },
        { name: 'Shortcuts', score: 10, check: () => manifest.shortcuts && manifest.shortcuts.length > 0 },
        { name: 'File Handlers', score: 5, check: () => manifest.file_handlers && manifest.file_handlers.length > 0 },
        { name: 'Screenshots', score: 5, check: () => manifest.screenshots && manifest.screenshots.length > 0 }
      ];

      manifestFeatures.forEach(feature => {
        const supported = feature.check();
        pwaFeatures.push({ ...feature, supported });
        if (supported) pwaScore += feature.score;
      });
    }

    // Check Service Worker
    if (fs.existsSync(serviceWorkerFile)) {
      const swContent = fs.readFileSync(serviceWorkerFile, 'utf8');
      const swFeatures = [
        { name: 'Service Worker', score: 20, check: () => true },
        { name: 'Install Handler', score: 5, check: () => swContent.includes('install') },
        { name: 'Activate Handler', score: 5, check: () => swContent.includes('activate') },
        { name: 'Fetch Handler', score: 10, check: () => swContent.includes('fetch') },
        { name: 'Caching Strategy', score: 10, check: () => swContent.includes('cache') }
      ];

      swFeatures.forEach(feature => {
        const supported = feature.check();
        pwaFeatures.push({ ...feature, supported });
        if (supported) pwaScore += feature.score;
      });
    }

    // Check icons
    const iconFiles = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
    const iconsPresent = iconFiles.filter(icon => fs.existsSync(path.join(iconsDir, icon)));

    this.results.pwa = {
      score: pwaScore,
      maxScore: 100,
      features: pwaFeatures,
      icons: {
        required: iconFiles,
        present: iconsPresent,
        coverage: iconsPresent.length / iconFiles.length * 100
      },
      installable: pwaScore >= 70,
      offlineCapable: pwaFeatures.some(f => f.name === 'Service Worker' && f.supported)
    };
  }

  // Analyze component integration
  analyzeComponentIntegration() {
    console.log('🔗 Analyzing component integration...');

    const componentsAnalyzed = [];
    const mobileComponentsDir = './src/components/timeline/mobile/';

    if (fs.existsSync(mobileComponentsDir)) {
      const mobileFiles = fs.readdirSync(mobileComponentsDir).filter(f => f.endsWith('.tsx'));

      mobileFiles.forEach(file => {
        const filePath = path.join(mobileComponentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        const component = {
          name: file.replace('.tsx', ''),
          file: file,
          features: {
            usesGestures: content.includes('useGestures') || content.includes('useTimelineItemGestures'),
            usesHaptics: content.includes('Vibrate.') || content.includes('haptic'),
            usesMobileHook: content.includes('useIsMobile'),
            hasTouchHandlers: content.includes('touch') || content.includes('Touch'),
            hasContextMenu: content.includes('ContextMenu'),
            hasSheets: content.includes('Sheet'),
            hasScrollArea: content.includes('ScrollArea'),
            hasResponsiveDesign: content.includes('md:') || content.includes('sm:') || content.includes('lg:'),
            usesAnimations: content.includes('transition') || content.includes('animate'),
            hasAccessibility: content.includes('aria-') || content.includes('role=')
          },
          dependencies: {
            gestureHooks: (content.match(/use\w*Gesture\w*/g) || []).length,
            hapticCalls: (content.match(/Vibrate\.\w+/g) || []).length,
            touchEvents: (content.match(/touch\w+/gi) || []).length
          },
          lineCount: content.split('\n').length
        };

        componentsAnalyzed.push(component);
      });
    }

    this.results.components = {
      analyzed: componentsAnalyzed,
      totalComponents: componentsAnalyzed.length,
      gestureIntegration: componentsAnalyzed.filter(c => c.features.usesGestures).length,
      hapticIntegration: componentsAnalyzed.filter(c => c.features.usesHaptics).length,
      mobileOptimized: componentsAnalyzed.filter(c => c.features.usesMobileHook).length,
      accessible: componentsAnalyzed.filter(c => c.features.hasAccessibility).length
    };
  }

  // Performance analysis
  analyzePerformance() {
    console.log('⚡ Analyzing mobile performance...');

    // Bundle size analysis (approximate)
    const srcDir = './src';
    let totalSize = 0;
    let fileCount = 0;

    function analyzeDirectory(dir) {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          analyzeDirectory(itemPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          totalSize += stat.size;
          fileCount++;
        }
      });
    }

    analyzeDirectory(srcDir);

    // Mobile-specific optimizations analysis
    const optimizations = {
      lazyLoading: this.checkForLazyLoading(),
      imageOptimization: this.checkImageOptimization(),
      bundleSplitting: this.checkBundleSplitting(),
      memoryManagement: this.checkMemoryOptimizations(),
      touchOptimizations: this.checkTouchOptimizations()
    };

    this.results.performance = {
      sourceCode: {
        totalSizeKB: Math.round(totalSize / 1024),
        fileCount,
        averageFileSizeKB: Math.round(totalSize / fileCount / 1024)
      },
      optimizations,
      score: Object.values(optimizations).filter(Boolean).length / Object.keys(optimizations).length * 100
    };
  }

  // Check for lazy loading patterns
  checkForLazyLoading() {
    const mainFile = './src/App.tsx';
    if (!fs.existsSync(mainFile)) return false;

    const content = fs.readFileSync(mainFile, 'utf8');
    return content.includes('lazy') || content.includes('Suspense') || content.includes('React.lazy');
  }

  // Check image optimization
  checkImageOptimization() {
    const publicDir = './public';
    if (!fs.existsSync(publicDir)) return false;

    const images = fs.readdirSync(publicDir).filter(f => f.match(/\.(png|jpg|jpeg|webp)$/i));
    return images.some(img => {
      const stat = fs.statSync(path.join(publicDir, img));
      return stat.size < 50000; // Less than 50KB considered optimized
    });
  }

  // Check for bundle splitting
  checkBundleSplitting() {
    const viteConfig = './vite.config.ts';
    if (!fs.existsSync(viteConfig)) return false;

    const content = fs.readFileSync(viteConfig, 'utf8');
    return content.includes('splitChunks') || content.includes('manualChunks') || content.includes('rollupOptions');
  }

  // Check memory optimizations
  checkMemoryOptimizations() {
    const hapticsFile = './src/lib/haptics.ts';
    if (!fs.existsSync(hapticsFile)) return false;

    const content = fs.readFileSync(hapticsFile, 'utf8');
    return content.includes('isLowEndDevice') || content.includes('deviceMemory') || content.includes('hardwareConcurrency');
  }

  // Check touch optimizations
  checkTouchOptimizations() {
    const hapticsFile = './src/lib/haptics.ts';
    if (!fs.existsSync(hapticsFile)) return false;

    const content = fs.readFileSync(hapticsFile, 'utf8');
    return content.includes('passive') || content.includes('touchstart') || content.includes('optimizeTouchEvents');
  }

  // Generate accessibility score
  analyzeAccessibility() {
    console.log('♿ Analyzing accessibility features...');

    const accessibilityFeatures = [
      { name: 'ARIA Labels', weight: 20, check: () => this.checkForFeature('aria-label') },
      { name: 'Keyboard Navigation', weight: 20, check: () => this.checkForFeature('onKeyDown') },
      { name: 'Focus Management', weight: 15, check: () => this.checkForFeature('focus') },
      { name: 'Screen Reader Support', weight: 15, check: () => this.checkForFeature('role=') },
      { name: 'High Contrast', weight: 10, check: () => this.checkForContrast() },
      { name: 'Reduced Motion', weight: 10, check: () => this.checkForReducedMotion() },
      { name: 'Touch Target Size', weight: 10, check: () => this.checkTouchTargets() }
    ];

    let accessibilityScore = 0;
    accessibilityFeatures.forEach(feature => {
      const supported = feature.check();
      feature.supported = supported;
      if (supported) accessibilityScore += feature.weight;
    });

    this.results.accessibility = {
      score: accessibilityScore,
      features: accessibilityFeatures,
      level: accessibilityScore >= 90 ? 'AA' : accessibilityScore >= 70 ? 'A' : 'Below A'
    };
  }

  // Helper methods for accessibility checks
  checkForFeature(pattern) {
    const srcDir = './src';
    const searchFiles = (dir) => {
      if (!fs.existsSync(dir)) return false;

      const items = fs.readdirSync(dir);
      return items.some(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          return searchFiles(itemPath);
        } else if (item.endsWith('.tsx')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          return content.includes(pattern);
        }
        return false;
      });
    };

    return searchFiles(srcDir);
  }

  checkForContrast() {
    const cssFile = './src/index.css';
    if (!fs.existsSync(cssFile)) return false;

    const content = fs.readFileSync(cssFile, 'utf8');
    return content.includes('contrast') || content.includes('high-contrast');
  }

  checkForReducedMotion() {
    const hapticsFile = './src/lib/haptics.ts';
    if (!fs.existsSync(hapticsFile)) return false;

    const content = fs.readFileSync(hapticsFile, 'utf8');
    return content.includes('prefers-reduced-motion') || content.includes('shouldReduceAnimations');
  }

  checkTouchTargets() {
    const cssFile = './src/index.css';
    if (!fs.existsSync(cssFile)) return false;

    const content = fs.readFileSync(cssFile, 'utf8');
    return content.includes('44px') || content.includes('touch-target') || content.includes('min-height: 44');
  }

  // Generate recommendations
  generateRecommendations() {
    console.log('📋 Generating recommendations...');

    const recommendations = [];

    // Architecture recommendations
    const { mobileComponents, gestureSystem, hapticSystem } = this.results.architecture;

    if (mobileComponents.count < 5) {
      recommendations.push({
        priority: 'High',
        category: 'Architecture',
        issue: 'Incomplete mobile component set',
        recommendation: 'Implement missing mobile components for full mobile experience',
        impact: 'User experience on mobile devices will be limited'
      });
    }

    if (gestureSystem.completeness < 80) {
      recommendations.push({
        priority: 'High',
        category: 'Gestures',
        issue: 'Incomplete gesture recognition system',
        recommendation: 'Implement missing gesture features (swipe, pinch, long-press)',
        impact: 'Mobile users cannot use full touch interaction capabilities'
      });
    }

    if (hapticSystem.completeness < 60) {
      recommendations.push({
        priority: 'Medium',
        category: 'Haptics',
        issue: 'Limited haptic feedback patterns',
        recommendation: 'Expand haptic feedback for better mobile UX',
        impact: 'Reduced tactile feedback quality on mobile'
      });
    }

    // PWA recommendations
    if (this.results.pwa.score < 80) {
      recommendations.push({
        priority: 'Medium',
        category: 'PWA',
        issue: 'PWA features incomplete',
        recommendation: 'Improve PWA manifest and add missing features',
        impact: 'App cannot be installed as native-like experience'
      });
    }

    // Performance recommendations
    if (this.results.performance.score < 70) {
      recommendations.push({
        priority: 'High',
        category: 'Performance',
        issue: 'Mobile performance optimizations missing',
        recommendation: 'Implement lazy loading, code splitting, and mobile optimizations',
        impact: 'Slow loading and poor performance on mobile devices'
      });
    }

    // Accessibility recommendations
    if (this.results.accessibility.score < 70) {
      recommendations.push({
        priority: 'High',
        category: 'Accessibility',
        issue: 'Accessibility standards not met',
        recommendation: 'Add ARIA labels, keyboard navigation, and screen reader support',
        impact: 'App unusable for users with disabilities'
      });
    }

    this.results.recommendations = recommendations;
  }

  // Calculate overall mobile readiness score
  calculateOverallScore() {
    const weights = {
      architecture: 0.25,
      pwa: 0.20,
      performance: 0.20,
      accessibility: 0.15,
      components: 0.20
    };

    const scores = {
      architecture: (this.results.architecture.gestureSystem.completeness + this.results.architecture.hapticSystem.completeness) / 2,
      pwa: this.results.pwa.score,
      performance: this.results.performance.score,
      accessibility: this.results.accessibility.score,
      components: (this.results.components.gestureIntegration / this.results.components.totalComponents) * 100
    };

    const overallScore = Object.keys(weights).reduce((total, category) => {
      return total + (scores[category] * weights[category]);
    }, 0);

    this.results.overallScore = Math.round(overallScore);
    this.results.scoreBreakdown = scores;
    this.results.readinessLevel = overallScore >= 80 ? 'Production Ready' :
                                  overallScore >= 60 ? 'Needs Work' : 'Not Ready';
  }

  // Save results
  saveResults() {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = path.join(RESULTS_DIR, `mobile-validation-${timestamp}.json`);
    const reportFile = path.join(RESULTS_DIR, `mobile-validation-report-${timestamp}.md`);

    // Save JSON results
    fs.writeFileSync(jsonFile, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const report = this.generateMarkdownReport();
    fs.writeFileSync(reportFile, report);

    console.log(`\n📊 Results saved:`);
    console.log(`   JSON: ${jsonFile}`);
    console.log(`   Report: ${reportFile}`);

    return { jsonFile, reportFile };
  }

  generateMarkdownReport() {
    const { timestamp, overallScore, readinessLevel, recommendations } = this.results;

    return `# Mobile Experience Validation Report

**Generated**: ${new Date(timestamp).toLocaleString()}
**Overall Score**: ${overallScore}/100 ⭐
**Readiness Level**: ${readinessLevel}

## Executive Summary

The AI Query Hub mobile experience has been analyzed across multiple dimensions including architecture, PWA capabilities, performance, and accessibility. The overall score of ${overallScore}/100 indicates ${readinessLevel.toLowerCase()} status.

## Architecture Analysis

### Mobile Components
- **Total Components**: ${this.results.architecture.mobileComponents.count}
- **Components Found**: ${this.results.architecture.mobileComponents.components.join(', ')}
- **Expected Components**: ${this.results.architecture.mobileComponents.expectedComponents.join(', ')}

### Gesture System
- **Completeness**: ${this.results.architecture.gestureSystem.completeness.toFixed(1)}%
- **Features**:
${this.results.architecture.gestureSystem.features.map(f => `  - ${f.name}: ${f.supported ? '✅' : '❌'}`).join('\n')}

### Haptic Feedback
- **Completeness**: ${this.results.architecture.hapticSystem.completeness.toFixed(1)}%
- **Features**:
${this.results.architecture.hapticSystem.features.map(f => `  - ${f.name}: ${f.supported ? '✅' : '❌'}`).join('\n')}

## PWA Features

- **Score**: ${this.results.pwa.score}/${this.results.pwa.maxScore}
- **Installable**: ${this.results.pwa.installable ? '✅' : '❌'}
- **Offline Capable**: ${this.results.pwa.offlineCapable ? '✅' : '❌'}
- **Icon Coverage**: ${this.results.pwa.icons.coverage.toFixed(1)}%

### PWA Feature Breakdown
${this.results.pwa.features.map(f => `- ${f.name}: ${f.supported ? '✅' : '❌'} (${f.score} points)`).join('\n')}

## Component Integration

- **Total Components Analyzed**: ${this.results.components.totalComponents}
- **Gesture Integration**: ${this.results.components.gestureIntegration}/${this.results.components.totalComponents}
- **Haptic Integration**: ${this.results.components.hapticIntegration}/${this.results.components.totalComponents}
- **Mobile Optimized**: ${this.results.components.mobileOptimized}/${this.results.components.totalComponents}
- **Accessibility Ready**: ${this.results.components.accessible}/${this.results.components.totalComponents}

## Performance Analysis

- **Performance Score**: ${this.results.performance.score.toFixed(1)}%
- **Source Code Size**: ${this.results.performance.sourceCode.totalSizeKB} KB (${this.results.performance.sourceCode.fileCount} files)
- **Average File Size**: ${this.results.performance.sourceCode.averageFileSizeKB} KB

### Mobile Optimizations
${Object.entries(this.results.performance.optimizations).map(([name, enabled]) => `- ${name}: ${enabled ? '✅' : '❌'}`).join('\n')}

## Accessibility

- **Accessibility Score**: ${this.results.accessibility.score}%
- **WCAG Level**: ${this.results.accessibility.level}

### Accessibility Features
${this.results.accessibility.features.map(f => `- ${f.name}: ${f.supported ? '✅' : '❌'} (${f.weight}% weight)`).join('\n')}

## Score Breakdown

${Object.entries(this.results.scoreBreakdown).map(([category, score]) => `- **${category.charAt(0).toUpperCase() + category.slice(1)}**: ${score.toFixed(1)}%`).join('\n')}

## Recommendations

${recommendations.length === 0 ? 'No critical issues found. Mobile experience is well-implemented.' :
  recommendations.map(r => `### ${r.priority} Priority: ${r.category}
**Issue**: ${r.issue}
**Recommendation**: ${r.recommendation}
**Impact**: ${r.impact}
`).join('\n')}

## Next Steps

${this.results.readinessLevel === 'Production Ready' ?
  '✅ The mobile experience is ready for production deployment.' :
  this.results.readinessLevel === 'Needs Work' ?
  '⚠️ Address medium and high priority recommendations before production.' :
  '❌ Significant mobile experience improvements needed before production deployment.'
}

---
*Generated by AI Query Hub Mobile Experience Validator*
`;
  }

  // Run all validation tests
  async run() {
    console.log('🚀 Starting mobile experience validation...\n');

    try {
      this.analyzeArchitecture();
      this.testPWAFeatures();
      this.analyzeComponentIntegration();
      this.analyzePerformance();
      this.analyzeAccessibility();
      this.generateRecommendations();
      this.calculateOverallScore();

      const files = this.saveResults();

      console.log(`\n✅ Mobile validation completed!`);
      console.log(`📊 Overall Score: ${this.results.overallScore}/100`);
      console.log(`🎯 Readiness: ${this.results.readinessLevel}`);
      console.log(`🔧 Recommendations: ${this.results.recommendations.length}`);

      return this.results;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new MobileExperienceValidator();
  validator.run()
    .then(results => {
      console.log('\n📋 Summary:');
      console.log(`   Overall Score: ${results.overallScore}/100`);
      console.log(`   Readiness: ${results.readinessLevel}`);
      console.log(`   Components: ${results.components.totalComponents} analyzed`);
      console.log(`   PWA Score: ${results.pwa.score}/100`);
      console.log(`   Accessibility: ${results.accessibility.level} level`);

      // Exit code based on readiness
      const exitCode = results.overallScore >= 80 ? 0 : results.overallScore >= 60 ? 1 : 2;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Validation failed:', error.message);
      process.exit(3);
    });
}

module.exports = { MobileExperienceValidator };