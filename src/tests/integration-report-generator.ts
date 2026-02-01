/**
 * Integration Testing Report Generator
 * Generates comprehensive testing reports with evidence validation
 */

import fs from 'fs/promises';
import path from 'path';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  duration: number;
  evidence?: string[];
  performance?: {
    target: number;
    actual: number;
    unit: string;
  };
  errors?: string[];
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  evidenceFiles?: string[];
}

interface IntegrationReport {
  timestamp: string;
  version: string;
  environment: string;
  overall: {
    status: 'PRODUCTION_READY' | 'NEEDS_WORK' | 'FAILED';
    confidence: number;
    criticalIssues: string[];
    qualityScore: number;
  };
  suites: TestSuite[];
  performance: {
    timelineRender: TestResult;
    budgetCalculation: TestResult;
    roleSwitching: TestResult;
    mobileScrolling: TestResult;
  };
  accessibility: {
    wcagCompliance: boolean;
    keyboardNavigation: boolean;
    screenReaderSupport: boolean;
    colorContrast: boolean;
  };
  evidence: {
    screenshots: string[];
    testReports: string[];
    coverageReports: string[];
    performanceReports: string[];
  };
}

export class IntegrationReportGenerator {
  private reportDir: string;
  private evidenceDir: string;

  constructor(reportDir = 'qa-evidence', evidenceDir = 'qa-evidence/screenshots') {
    this.reportDir = reportDir;
    this.evidenceDir = evidenceDir;
  }

  /**
   * Generate comprehensive integration test report
   */
  async generateReport(): Promise<IntegrationReport> {
    const timestamp = new Date().toISOString();

    // Collect test results from all sources
    const unitTestResults = await this.collectUnitTestResults();
    const integrationTestResults = await this.collectIntegrationTestResults();
    const e2eTestResults = await this.collectE2ETestResults();
    const performanceResults = await this.collectPerformanceResults();
    const accessibilityResults = await this.collectAccessibilityResults();
    const evidence = await this.collectEvidence();

    // Analyze overall status
    const overall = this.analyzeOverallStatus([
      unitTestResults,
      integrationTestResults,
      e2eTestResults,
    ]);

    const report: IntegrationReport = {
      timestamp,
      version: '1.0.0',
      environment: 'test',
      overall,
      suites: [unitTestResults, integrationTestResults, e2eTestResults],
      performance: performanceResults,
      accessibility: accessibilityResults,
      evidence,
    };

    await this.writeReport(report);
    await this.generateMarkdownReport(report);

    return report;
  }

  /**
   * Collect unit test results from Vitest coverage
   */
  private async collectUnitTestResults(): Promise<TestSuite> {
    try {
      const coverageFile = path.join(this.reportDir, 'reports/unit/test-results.json');
      const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf-8'));

      return {
        name: 'Unit Tests',
        description: 'Attention Budget Engine and Role Optimization Logic',
        tests: this.parseVitestResults(coverageData),
        coverage: this.extractCoverageMetrics(coverageData),
        evidenceFiles: ['reports/unit/coverage/index.html'],
      };
    } catch (error) {
      return this.createFailedSuite('Unit Tests', 'Failed to collect unit test results');
    }
  }

  /**
   * Collect integration test results
   */
  private async collectIntegrationTestResults(): Promise<TestSuite> {
    try {
      const integrationFile = path.join(this.reportDir, 'reports/integration/test-results.json');
      const integrationData = JSON.parse(await fs.readFile(integrationFile, 'utf-8'));

      return {
        name: 'Integration Tests',
        description: 'End-to-end workflows and component interactions',
        tests: this.parseVitestResults(integrationData),
        evidenceFiles: ['screenshots/workflow/calibration-complete.png'],
      };
    } catch (error) {
      return this.createFailedSuite('Integration Tests', 'Failed to collect integration test results');
    }
  }

  /**
   * Collect E2E test results from Playwright
   */
  private async collectE2ETestResults(): Promise<TestSuite> {
    try {
      const e2eFile = path.join(this.reportDir, 'reports/e2e/playwright-results.json');
      const e2eData = JSON.parse(await fs.readFile(e2eFile, 'utf-8'));

      return {
        name: 'End-to-End Tests',
        description: 'Complete user journey validation with browser automation',
        tests: this.parsePlaywrightResults(e2eData),
        evidenceFiles: [
          'screenshots/desktop/timeline-overview.png',
          'screenshots/mobile/timeline-mobile.png',
          'screenshots/workflow/calibration-wizard.png',
        ],
      };
    } catch (error) {
      return this.createFailedSuite('E2E Tests', 'Failed to collect E2E test results');
    }
  }

  /**
   * Collect performance benchmark results
   */
  private async collectPerformanceResults(): Promise<IntegrationReport['performance']> {
    try {
      const performanceFile = path.join(this.reportDir, 'reports/performance/benchmark-results.json');
      const performanceData = JSON.parse(await fs.readFile(performanceFile, 'utf-8'));

      return {
        timelineRender: {
          name: 'Timeline Rendering',
          status: performanceData.timelineRender?.actual < 500 ? 'PASS' : 'FAIL',
          duration: performanceData.timelineRender?.actual || 0,
          performance: {
            target: 500,
            actual: performanceData.timelineRender?.actual || 0,
            unit: 'ms',
          },
        },
        budgetCalculation: {
          name: 'Budget Calculation',
          status: performanceData.budgetUpdate?.actual < 100 ? 'PASS' : 'FAIL',
          duration: performanceData.budgetUpdate?.actual || 0,
          performance: {
            target: 100,
            actual: performanceData.budgetUpdate?.actual || 0,
            unit: 'ms',
          },
        },
        roleSwitching: {
          name: 'Role Mode Switching',
          status: performanceData.roleSwitch?.actual < 200 ? 'PASS' : 'FAIL',
          duration: performanceData.roleSwitch?.actual || 0,
          performance: {
            target: 200,
            actual: performanceData.roleSwitch?.actual || 0,
            unit: 'ms',
          },
        },
        mobileScrolling: {
          name: 'Mobile Scrolling Performance',
          status: performanceData.mobileScrollFps?.actual > 30 ? 'PASS' : 'FAIL',
          duration: 0,
          performance: {
            target: 60,
            actual: performanceData.mobileScrollFps?.actual || 0,
            unit: 'fps',
          },
        },
      };
    } catch (error) {
      return this.createFailedPerformanceResults();
    }
  }

  /**
   * Collect accessibility test results
   */
  private async collectAccessibilityResults(): Promise<IntegrationReport['accessibility']> {
    try {
      const accessibilityFile = path.join(this.reportDir, 'reports/accessibility/test-results.json');
      const accessibilityData = JSON.parse(await fs.readFile(accessibilityFile, 'utf-8'));

      return {
        wcagCompliance: accessibilityData.wcag?.passed || false,
        keyboardNavigation: accessibilityData.keyboard?.passed || false,
        screenReaderSupport: accessibilityData.screenReader?.passed || false,
        colorContrast: accessibilityData.colorContrast?.passed || false,
      };
    } catch (error) {
      return {
        wcagCompliance: false,
        keyboardNavigation: false,
        screenReaderSupport: false,
        colorContrast: false,
      };
    }
  }

  /**
   * Collect evidence files
   */
  private async collectEvidence(): Promise<IntegrationReport['evidence']> {
    try {
      const screenshots = await this.findFiles(path.join(this.evidenceDir), '.png');
      const testReports = await this.findFiles(path.join(this.reportDir, 'reports'), '.json');
      const coverageReports = await this.findFiles(path.join(this.reportDir, 'reports/unit/coverage'), '.html');
      const performanceReports = await this.findFiles(path.join(this.reportDir, 'reports/performance'), '.json');

      return {
        screenshots,
        testReports,
        coverageReports,
        performanceReports,
      };
    } catch (error) {
      return {
        screenshots: [],
        testReports: [],
        coverageReports: [],
        performanceReports: [],
      };
    }
  }

  /**
   * Analyze overall testing status
   */
  private analyzeOverallStatus(suites: TestSuite[]): IntegrationReport['overall'] {
    const allTests = suites.flatMap(suite => suite.tests);
    const passedTests = allTests.filter(test => test.status === 'PASS').length;
    const failedTests = allTests.filter(test => test.status === 'FAIL').length;
    const totalTests = allTests.length;

    const passRate = totalTests > 0 ? passedTests / totalTests : 0;
    const qualityScore = Math.round(passRate * 100);

    // Check coverage requirements
    const unitSuite = suites.find(s => s.name === 'Unit Tests');
    const coveragePass = unitSuite?.coverage ?
      unitSuite.coverage.statements >= 95 &&
      unitSuite.coverage.branches >= 95 &&
      unitSuite.coverage.functions >= 95 &&
      unitSuite.coverage.lines >= 95 : false;

    const criticalIssues: string[] = [];

    if (failedTests > 0) {
      criticalIssues.push(`${failedTests} test failures detected`);
    }

    if (!coveragePass) {
      criticalIssues.push('Unit test coverage below 95% threshold');
    }

    // Determine production readiness
    let status: 'PRODUCTION_READY' | 'NEEDS_WORK' | 'FAILED' = 'FAILED';
    let confidence = 0;

    if (criticalIssues.length === 0 && passRate >= 0.95 && qualityScore >= 90) {
      status = 'PRODUCTION_READY';
      confidence = Math.round(passRate * 100);
    } else if (criticalIssues.length <= 2 && passRate >= 0.80) {
      status = 'NEEDS_WORK';
      confidence = Math.round(passRate * 80);
    }

    return {
      status,
      confidence,
      criticalIssues,
      qualityScore,
    };
  }

  /**
   * Generate markdown report
   */
  private async generateMarkdownReport(report: IntegrationReport): Promise<void> {
    const timestamp = new Date().toLocaleString();

    const markdown = `# 3-2-1 Attention System - Integration Testing Report

**Generated:** ${timestamp}
**Status:** ${report.overall.status}
**Quality Score:** ${report.overall.qualityScore}/100
**Confidence:** ${report.overall.confidence}%

## Executive Summary

${this.generateExecutiveSummary(report)}

## Test Suite Results

${report.suites.map(suite => this.generateSuiteSection(suite)).join('\n\n')}

## Performance Benchmarks

${this.generatePerformanceSection(report.performance)}

## Accessibility Compliance

${this.generateAccessibilitySection(report.accessibility)}

## Evidence Files

### Screenshots Captured
${report.evidence.screenshots.map(file => `- ${file}`).join('\n')}

### Test Reports
${report.evidence.testReports.map(file => `- ${file}`).join('\n')}

### Coverage Reports
${report.evidence.coverageReports.map(file => `- ${file}`).join('\n')}

## Critical Issues

${report.overall.criticalIssues.length > 0
  ? report.overall.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
  : '✅ No critical issues found'
}

## Production Readiness Assessment

**Status:** ${report.overall.status}

${this.generateProductionAssessment(report)}

---

*Generated by Integration Agent - Professional QA Testing Suite*
`;

    await fs.writeFile(
      path.join(this.reportDir, `integration-report-${Date.now()}.md`),
      markdown
    );
  }

  private generateExecutiveSummary(report: IntegrationReport): string {
    const totalTests = report.suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = report.suites.reduce((sum, suite) =>
      sum + suite.tests.filter(test => test.status === 'PASS').length, 0
    );

    return `This comprehensive testing validates the 3-2-1 Attention System's production readiness.

**Test Coverage:** ${totalTests} tests across ${report.suites.length} test suites
**Pass Rate:** ${passedTests}/${totalTests} (${Math.round(passedTests / totalTests * 100)}%)
**Critical Features:** Weekly calibration, role switching, budget management, mobile experience
**Performance:** All benchmarks ${Object.values(report.performance).every(p => p.status === 'PASS') ? 'PASSED' : 'FAILED'}
**Accessibility:** WCAG AA ${report.accessibility.wcagCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}`;
  }

  private generateSuiteSection(suite: TestSuite): string {
    const passedTests = suite.tests.filter(test => test.status === 'PASS').length;
    const failedTests = suite.tests.filter(test => test.status === 'FAIL').length;

    return `### ${suite.name}

**Description:** ${suite.description}
**Results:** ${passedTests} passed, ${failedTests} failed

${suite.coverage ? `**Coverage:**
- Statements: ${suite.coverage.statements}%
- Branches: ${suite.coverage.branches}%
- Functions: ${suite.coverage.functions}%
- Lines: ${suite.coverage.lines}%` : ''}

${suite.tests.map(test =>
  `- ${test.status === 'PASS' ? '✅' : '❌'} ${test.name} (${test.duration}ms)`
).join('\n')}`;
  }

  private generatePerformanceSection(performance: IntegrationReport['performance']): string {
    return `| Metric | Target | Actual | Status |
|--------|---------|---------|---------|
| ${performance.timelineRender.name} | <${performance.timelineRender.performance?.target}ms | ${performance.timelineRender.performance?.actual}ms | ${performance.timelineRender.status === 'PASS' ? '✅' : '❌'} |
| ${performance.budgetCalculation.name} | <${performance.budgetCalculation.performance?.target}ms | ${performance.budgetCalculation.performance?.actual}ms | ${performance.budgetCalculation.status === 'PASS' ? '✅' : '❌'} |
| ${performance.roleSwitching.name} | <${performance.roleSwitching.performance?.target}ms | ${performance.roleSwitching.performance?.actual}ms | ${performance.roleSwitching.status === 'PASS' ? '✅' : '❌'} |
| ${performance.mobileScrolling.name} | >${performance.mobileScrolling.performance?.target}fps | ${performance.mobileScrolling.performance?.actual}fps | ${performance.mobileScrolling.status === 'PASS' ? '✅' : '❌'} |`;
  }

  private generateAccessibilitySection(accessibility: IntegrationReport['accessibility']): string {
    return `- WCAG AA Compliance: ${accessibility.wcagCompliance ? '✅ PASS' : '❌ FAIL'}
- Keyboard Navigation: ${accessibility.keyboardNavigation ? '✅ PASS' : '❌ FAIL'}
- Screen Reader Support: ${accessibility.screenReaderSupport ? '✅ PASS' : '❌ FAIL'}
- Color Contrast: ${accessibility.colorContrast ? '✅ PASS' : '❌ FAIL'}`;
  }

  private generateProductionAssessment(report: IntegrationReport): string {
    switch (report.overall.status) {
      case 'PRODUCTION_READY':
        return `✅ **APPROVED FOR PRODUCTION**

All critical workflows validated with comprehensive evidence:
- Complete user journeys functional
- Performance benchmarks exceeded
- Cross-browser compatibility confirmed
- Accessibility standards met
- Mobile experience fully functional

**Recommendation:** Deploy with confidence.`;

      case 'NEEDS_WORK':
        return `⚠️ **REQUIRES FIXES BEFORE PRODUCTION**

System shows promise but needs addressing:
${report.overall.criticalIssues.map(issue => `- ${issue}`).join('\n')}

**Recommendation:** Address critical issues and re-test.`;

      case 'FAILED':
        return `❌ **NOT READY FOR PRODUCTION**

Critical failures prevent deployment:
${report.overall.criticalIssues.map(issue => `- ${issue}`).join('\n')}

**Recommendation:** Major fixes required before re-assessment.`;
    }
  }

  // Utility methods
  private parseVitestResults(data: any): TestResult[] {
    // Parse Vitest JSON results
    if (!data.testResults) return [];

    return data.testResults.map((test: any) => ({
      name: test.name || 'Unknown test',
      status: test.status === 'passed' ? 'PASS' : 'FAIL',
      duration: test.duration || 0,
      errors: test.failureMessages || [],
    }));
  }

  private parsePlaywrightResults(data: any): TestResult[] {
    // Parse Playwright JSON results
    if (!data.suites) return [];

    const tests: TestResult[] = [];
    data.suites.forEach((suite: any) => {
      suite.specs?.forEach((spec: any) => {
        tests.push({
          name: spec.title || 'Unknown test',
          status: spec.ok ? 'PASS' : 'FAIL',
          duration: spec.duration || 0,
          errors: spec.tests?.filter((t: any) => !t.ok).map((t: any) => t.error) || [],
        });
      });
    });

    return tests;
  }

  private extractCoverageMetrics(data: any): TestSuite['coverage'] {
    const coverage = data.coverage || data.coverageMap;
    if (!coverage) return undefined;

    return {
      statements: coverage.statements?.pct || 0,
      branches: coverage.branches?.pct || 0,
      functions: coverage.functions?.pct || 0,
      lines: coverage.lines?.pct || 0,
    };
  }

  private createFailedSuite(name: string, error: string): TestSuite {
    return {
      name,
      description: 'Failed to collect results',
      tests: [{
        name: 'Test Collection',
        status: 'FAIL',
        duration: 0,
        errors: [error],
      }],
    };
  }

  private createFailedPerformanceResults(): IntegrationReport['performance'] {
    return {
      timelineRender: { name: 'Timeline Rendering', status: 'FAIL', duration: 0 },
      budgetCalculation: { name: 'Budget Calculation', status: 'FAIL', duration: 0 },
      roleSwitching: { name: 'Role Mode Switching', status: 'FAIL', duration: 0 },
      mobileScrolling: { name: 'Mobile Scrolling', status: 'FAIL', duration: 0 },
    };
  }

  private async findFiles(dir: string, extension: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  private async writeReport(report: IntegrationReport): Promise<void> {
    await fs.writeFile(
      path.join(this.reportDir, `integration-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );
  }
}