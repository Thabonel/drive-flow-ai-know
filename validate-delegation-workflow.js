/**
 * Delegation Workflow System Component Validation
 * Tests the delegation workflow components and their integration
 */

import fs from 'fs/promises';
import path from 'path';

const COMPONENTS_TO_VALIDATE = [
  'src/components/timeline/DelegationButton.tsx',
  'src/components/timeline/DelegationDashboard.tsx',
  'src/components/timeline/RouterInbox.tsx',
  'src/components/timeline/TrustLevelManagement.tsx',
  'src/components/timeline/FollowUpAutomation.tsx',
  'src/components/timeline/MultiplierDashboard.tsx'
];

const HOOKS_TO_VALIDATE = [
  'src/hooks/useDelegations.ts',
  'src/hooks/useRouterInbox.ts',
  'src/hooks/useTrustLevelData.ts',
  'src/hooks/useTeamWorkload.ts',
  'src/hooks/useFollowUpAutomation.ts'
];

const DATABASE_FILES = [
  'supabase/migrations/20250201000020_delegation_workflow_enhancements.sql'
];

class DelegationWorkflowValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      components: [],
      hooks: [],
      database: [],
      integration: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async validateFile(filePath, type) {
    console.log(`🔍 Validating ${type}: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const validation = {
        file: filePath,
        type,
        exists: true,
        size: content.length,
        lines: content.split('\n').length,
        issues: [],
        features: []
      };

      // Component-specific validations
      if (type === 'component') {
        this.validateComponent(content, validation);
      } else if (type === 'hook') {
        this.validateHook(content, validation);
      } else if (type === 'database') {
        this.validateDatabase(content, validation);
      }

      // Common validations
      this.validateCommonPatterns(content, validation);

      const status = validation.issues.length === 0 ? 'PASSED' :
                   validation.issues.some(i => i.severity === 'error') ? 'FAILED' : 'WARNING';

      validation.status = status;

      if (status === 'PASSED') this.results.summary.passed++;
      else if (status === 'FAILED') this.results.summary.failed++;
      else this.results.summary.warnings++;

      this.results.summary.total++;

      // Ensure the array exists
      if (!this.results[`${type}s`]) {
        this.results[`${type}s`] = [];
      }
      this.results[`${type}s`].push(validation);

      console.log(`${status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️'} ${filePath} - ${status}`);

      return validation;

    } catch (error) {
      const validation = {
        file: filePath,
        type,
        exists: false,
        status: 'FAILED',
        error: error.message
      };

      this.results.summary.total++;
      this.results.summary.failed++;

      // Ensure the array exists
      if (!this.results[`${type}s`]) {
        this.results[`${type}s`] = [];
      }
      this.results[`${type}s`].push(validation);

      console.log(`❌ ${filePath} - FAILED (${error.message})`);
      return validation;
    }
  }

  validateComponent(content, validation) {
    // Check for essential component patterns
    const requiredPatterns = [
      { pattern: /export\s+(function|const)\s+\w+/, name: 'Component export' },
      { pattern: /import.*react/i, name: 'React import' },
      { pattern: /interface\s+\w+Props/, name: 'Props interface' }
    ];

    requiredPatterns.forEach(({ pattern, name }) => {
      if (!pattern.test(content)) {
        validation.issues.push({
          severity: 'warning',
          message: `Missing ${name}`,
          line: 0
        });
      } else {
        validation.features.push(name);
      }
    });

    // Check for delegation-specific patterns
    const delegationPatterns = [
      { pattern: /trust.?level/i, name: 'Trust level handling' },
      { pattern: /delegation/i, name: 'Delegation functionality' },
      { pattern: /useTeam|useAuth|supabase/i, name: 'Data integration' },
      { pattern: /onClick|onSubmit|handle\w+/i, name: 'Event handlers' }
    ];

    delegationPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        validation.features.push(name);
      }
    });

    // Check for accessibility
    if (content.includes('aria-') || content.includes('role=')) {
      validation.features.push('Accessibility attributes');
    }

    // Check for error handling
    if (content.includes('try') && content.includes('catch')) {
      validation.features.push('Error handling');
    }
  }

  validateHook(content, validation) {
    // Check for hook patterns
    const hookPatterns = [
      { pattern: /export\s+function\s+use\w+/, name: 'Hook export', required: true },
      { pattern: /useState|useEffect|useCallback/, name: 'React hooks', required: true },
      { pattern: /supabase/i, name: 'Supabase integration' },
      { pattern: /try.*catch/s, name: 'Error handling' }
    ];

    hookPatterns.forEach(({ pattern, name, required }) => {
      if (!pattern.test(content)) {
        if (required) {
          validation.issues.push({
            severity: 'error',
            message: `Missing required ${name}`,
            line: 0
          });
        }
      } else {
        validation.features.push(name);
      }
    });

    // Check for TypeScript interfaces
    if (content.includes('interface ')) {
      validation.features.push('TypeScript interfaces');
    }

    // Check for async operations
    if (content.includes('async ') || content.includes('await ')) {
      validation.features.push('Async operations');
    }
  }

  validateDatabase(content, validation) {
    // Check for database patterns
    const dbPatterns = [
      { pattern: /CREATE TABLE/i, name: 'Table creation', required: true },
      { pattern: /ALTER TABLE/i, name: 'Table alterations' },
      { pattern: /CREATE INDEX/i, name: 'Index creation' },
      { pattern: /CREATE POLICY/i, name: 'RLS policies', required: true },
      { pattern: /CREATE FUNCTION/i, name: 'Database functions' }
    ];

    dbPatterns.forEach(({ pattern, name, required }) => {
      if (!pattern.test(content)) {
        if (required) {
          validation.issues.push({
            severity: 'error',
            message: `Missing ${name}`,
            line: 0
          });
        }
      } else {
        validation.features.push(name);
      }
    });

    // Check for delegation-specific tables
    const delegationTables = [
      'delegations',
      'router_inbox',
      'delegation_follow_ups',
      'team_workload_indicators'
    ];

    delegationTables.forEach(table => {
      if (content.includes(table)) {
        validation.features.push(`${table} table`);
      }
    });
  }

  validateCommonPatterns(content, validation) {
    // Check for TypeScript
    if (!content.includes(': ') && !content.includes('interface')) {
      validation.issues.push({
        severity: 'warning',
        message: 'No TypeScript type annotations found',
        line: 0
      });
    }

    // Check for comments/documentation
    if (!content.includes('//') && !content.includes('/*')) {
      validation.issues.push({
        severity: 'info',
        message: 'No comments found',
        line: 0
      });
    }

    // Check for console.log (should be removed for production)
    if (content.includes('console.log')) {
      validation.issues.push({
        severity: 'warning',
        message: 'console.log statements found',
        line: 0
      });
    }
  }

  async validateIntegration() {
    console.log('🔗 Validating component integration...');

    const integrationChecks = [];

    // Check if MultiplierDashboard imports all sub-components
    try {
      const multiplierContent = await fs.readFile('src/components/timeline/MultiplierDashboard.tsx', 'utf-8');

      const expectedImports = [
        'DelegationDashboard',
        'RouterInbox',
        'TrustLevelManagement',
        'FollowUpAutomation'
      ];

      expectedImports.forEach(component => {
        if (multiplierContent.includes(`import.*${component}`)) {
          integrationChecks.push({
            check: `${component} imported in MultiplierDashboard`,
            status: 'PASSED'
          });
        } else {
          integrationChecks.push({
            check: `${component} imported in MultiplierDashboard`,
            status: 'FAILED',
            issue: 'Component not imported'
          });
        }
      });

    } catch (error) {
      integrationChecks.push({
        check: 'MultiplierDashboard integration',
        status: 'FAILED',
        error: error.message
      });
    }

    // Check page integration
    try {
      const pageContent = await fs.readFile('src/pages/MultiplierMode.tsx', 'utf-8');

      if (pageContent.includes('MultiplierDashboard')) {
        integrationChecks.push({
          check: 'MultiplierMode page integration',
          status: 'PASSED'
        });
      } else {
        integrationChecks.push({
          check: 'MultiplierMode page integration',
          status: 'FAILED',
          issue: 'MultiplierDashboard not used in page'
        });
      }

    } catch (error) {
      integrationChecks.push({
        check: 'MultiplierMode page integration',
        status: 'FAILED',
        error: error.message
      });
    }

    // Check hook integrations
    const hookIntegrations = [
      { component: 'DelegationDashboard', hook: 'useDelegations' },
      { component: 'RouterInbox', hook: 'useRouterInbox' },
      { component: 'TrustLevelManagement', hook: 'useTrustLevelData' }
    ];

    for (const { component, hook } of hookIntegrations) {
      try {
        const componentPath = `src/components/timeline/${component}.tsx`;
        const componentContent = await fs.readFile(componentPath, 'utf-8');

        if (componentContent.includes(hook)) {
          integrationChecks.push({
            check: `${component} uses ${hook}`,
            status: 'PASSED'
          });
        } else {
          integrationChecks.push({
            check: `${component} uses ${hook}`,
            status: 'WARNING',
            issue: 'Hook not found in component'
          });
        }

      } catch (error) {
        integrationChecks.push({
          check: `${component} integration`,
          status: 'FAILED',
          error: error.message
        });
      }
    }

    this.results.integration = integrationChecks;

    const passed = integrationChecks.filter(c => c.status === 'PASSED').length;
    const failed = integrationChecks.filter(c => c.status === 'FAILED').length;

    console.log(`🔗 Integration validation: ${passed} passed, ${failed} failed`);
  }

  async generateReport() {
    const reportPath = 'public/delegation-test-results/validation-report.json';
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    console.log('\n📊 DELEGATION WORKFLOW VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`Total Files: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed} ✅`);
    console.log(`Failed: ${this.results.summary.failed} ❌`);
    console.log(`Warnings: ${this.results.summary.warnings} ⚠️`);

    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    // Feature summary
    const allFeatures = [];
    [...this.results.components, ...this.results.hooks].forEach(item => {
      if (item.features) allFeatures.push(...item.features);
    });

    const uniqueFeatures = [...new Set(allFeatures)];
    console.log(`\nFeatures Detected: ${uniqueFeatures.length}`);
    uniqueFeatures.slice(0, 10).forEach(feature => console.log(`  - ${feature}`));
    if (uniqueFeatures.length > 10) {
      console.log(`  ... and ${uniqueFeatures.length - 10} more`);
    }

    console.log(`\nReport saved to: ${reportPath}`);

    return {
      success: this.results.summary.failed === 0,
      summary: this.results.summary,
      reportPath
    };
  }

  async runValidation() {
    console.log('🧪 Starting Delegation Workflow Component Validation...');
    console.log('Testing: Components, Hooks, Database Schema, Integration');

    // Validate components
    for (const componentPath of COMPONENTS_TO_VALIDATE) {
      await this.validateFile(componentPath, 'component');
    }

    // Validate hooks
    for (const hookPath of HOOKS_TO_VALIDATE) {
      await this.validateFile(hookPath, 'hook');
    }

    // Validate database files
    for (const dbPath of DATABASE_FILES) {
      await this.validateFile(dbPath, 'database');
    }

    // Validate integration
    await this.validateIntegration();

    // Generate report
    return await this.generateReport();
  }
}

// Run validation
const validator = new DelegationWorkflowValidator();
const results = await validator.runValidation();

process.exit(results.success ? 0 : 1);