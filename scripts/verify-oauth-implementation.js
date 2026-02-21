#!/usr/bin/env node
/**
 * OAuth Implementation Verification Script
 *
 * Comprehensive testing suite for Google OAuth redirect_uri_mismatch fix
 * Tests routing, environment configuration, and integration health
 */

import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class OAuthVerifier {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logResult(test, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    this.log(`${status} ${test}`, color);
    if (details) {
      this.log(`   ${details}`, 'blue');
    }
    this.results.push({ test, passed, details });
    if (!passed) this.errors.push(test);
  }

  async verifyRouting() {
    this.log('\n🔍 VERIFYING ROUTING CONFIGURATION', 'bold');

    try {
      // Check App.tsx for EnhancedGoogleCallback import and route
      const appTsx = readFileSync('./src/App.tsx', 'utf8');

      const hasImport = appTsx.includes('import("./pages/auth/EnhancedGoogleCallback")');
      this.logResult(
        'EnhancedGoogleCallback import exists in App.tsx',
        hasImport,
        hasImport ? 'Found lazy import' : 'Missing React.lazy import'
      );

      const hasRoute = appTsx.includes('path="/auth/google/enhanced-callback"');
      this.logResult(
        'Enhanced callback route exists in App.tsx',
        hasRoute,
        hasRoute ? 'Route: /auth/google/enhanced-callback' : 'Route not found in routing'
      );

      const hasElement = appTsx.includes('<EnhancedGoogleCallback />');
      this.logResult(
        'Route element properly configured',
        hasElement,
        hasElement ? 'Element configured correctly' : 'Missing route element'
      );

      // Verify EnhancedGoogleCallback component exists
      try {
        const componentExists = readFileSync('./src/pages/auth/EnhancedGoogleCallback.tsx', 'utf8');
        this.logResult(
          'EnhancedGoogleCallback component file exists',
          true,
          'Component file found'
        );
      } catch (error) {
        this.logResult(
          'EnhancedGoogleCallback component file exists',
          false,
          'Component file not found'
        );
      }

    } catch (error) {
      this.logResult(
        'App.tsx routing verification',
        false,
        `Error reading App.tsx: ${error.message}`
      );
    }
  }

  async verifyOAuthConfiguration() {
    this.log('\n🔍 VERIFYING OAUTH CONFIGURATION', 'bold');

    try {
      // Check oauth config file
      const oauthConfig = readFileSync('./src/config/oauth.ts', 'utf8');

      const hasDetectFunction = oauthConfig.includes('export const detectOAuthEnvironment');
      this.logResult(
        'Environment detection function exists',
        hasDetectFunction,
        hasDetectFunction ? 'detectOAuthEnvironment function found' : 'Function missing'
      );

      const hasGetConfigFunction = oauthConfig.includes('export const getOAuthConfig');
      this.logResult(
        'OAuth config function exists',
        hasGetConfigFunction,
        hasGetConfigFunction ? 'getOAuthConfig function found' : 'Function missing'
      );

      const hasDynamicRedirectUri = oauthConfig.includes('${origin}/auth/google/callback');
      this.logResult(
        'Dynamic redirect URI configuration',
        hasDynamicRedirectUri,
        hasDynamicRedirectUri ? 'Uses dynamic origin detection' : 'May be hardcoded'
      );

      const hasClientId = oauthConfig.includes('1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com');
      this.logResult(
        'Google Client ID configured',
        hasClientId,
        hasClientId ? 'Client ID found in config' : 'Client ID not found'
      );

    } catch (error) {
      this.logResult(
        'OAuth configuration verification',
        false,
        `Error reading oauth config: ${error.message}`
      );
    }
  }

  async verifyDocumentation() {
    this.log('\n🔍 VERIFYING DOCUMENTATION UPDATES', 'bold');

    try {
      // Check environment setup documentation
      const envSetupDoc = readFileSync('./docs/06-Development/environment-setup.md', 'utf8');

      const hasGoogleClientSecret = envSetupDoc.includes('GOOGLE_CLIENT_SECRET');
      this.logResult(
        'GOOGLE_CLIENT_SECRET documented',
        hasGoogleClientSecret,
        hasGoogleClientSecret ? 'Found in environment variables table' : 'Missing from documentation'
      );

      const hasDescription = envSetupDoc.includes('Google OAuth token exchange');
      this.logResult(
        'Environment variable description provided',
        hasDescription,
        hasDescription ? 'Descriptive documentation found' : 'Missing description'
      );

      const hasRequiredFlag = envSetupDoc.includes('| `GOOGLE_CLIENT_SECRET` | Yes |');
      this.logResult(
        'Variable marked as required',
        hasRequiredFlag,
        hasRequiredFlag ? 'Marked as required in table' : 'Not marked as required'
      );

    } catch (error) {
      this.logResult(
        'Documentation verification',
        false,
        `Error reading documentation: ${error.message}`
      );
    }
  }

  async verifyIntegrationComponents() {
    this.log('\n🔍 VERIFYING INTEGRATION COMPONENTS', 'bold');

    try {
      // Check GoogleIntegrationHealth component
      const healthComponent = readFileSync('./src/components/integrations/GoogleIntegrationHealth.tsx', 'utf8');

      const hasHealthChecks = healthComponent.includes('runHealthCheck');
      this.logResult(
        'Google Integration Health component has health checks',
        hasHealthChecks,
        hasHealthChecks ? 'Health check functionality found' : 'Missing health checks'
      );

      const hasEnvironmentDetection = healthComponent.includes('detectOAuthEnvironment');
      this.logResult(
        'Health component uses environment detection',
        hasEnvironmentDetection,
        hasEnvironmentDetection ? 'Environment detection integrated' : 'Missing environment detection'
      );

      // Check GoogleOAuthTestButton component
      const testButton = readFileSync('./src/components/integrations/GoogleOAuthTestButton.tsx', 'utf8');

      const hasEnhancedHook = testButton.includes('useEnhancedGoogleOAuth');
      this.logResult(
        'OAuth test button uses enhanced hook',
        hasEnhancedHook,
        hasEnhancedHook ? 'Uses enhanced OAuth hook' : 'Using basic OAuth hook'
      );

      const hasPopupDetection = testButton.includes('detectPopupBlocking');
      this.logResult(
        'Test button has popup detection',
        hasPopupDetection,
        hasPopupDetection ? 'Popup blocking detection found' : 'Missing popup detection'
      );

    } catch (error) {
      this.logResult(
        'Integration components verification',
        false,
        `Error reading components: ${error.message}`
      );
    }
  }

  async verifySettings() {
    this.log('\n🔍 VERIFYING SETTINGS PAGE INTEGRATION', 'bold');

    try {
      const settingsPage = readFileSync('./src/pages/Settings.tsx', 'utf8');

      const hasHealthImport = settingsPage.includes("import { GoogleIntegrationHealth }");
      this.logResult(
        'Settings page imports Google Integration Health',
        hasHealthImport,
        hasHealthImport ? 'Import found' : 'Missing import'
      );

      const hasTestButtonImport = settingsPage.includes("import { GoogleOAuthTestButton }");
      this.logResult(
        'Settings page imports OAuth Test Button',
        hasTestButtonImport,
        hasTestButtonImport ? 'Import found' : 'Missing import'
      );

      const hasHealthComponent = settingsPage.includes('<GoogleIntegrationHealth />');
      this.logResult(
        'Settings page renders Health component',
        hasHealthComponent,
        hasHealthComponent ? 'Component rendered' : 'Component not rendered'
      );

      const hasTestComponent = settingsPage.includes('<GoogleOAuthTestButton />');
      this.logResult(
        'Settings page renders Test Button component',
        hasTestComponent,
        hasTestComponent ? 'Component rendered' : 'Component not rendered'
      );

    } catch (error) {
      this.logResult(
        'Settings page verification',
        false,
        `Error reading Settings page: ${error.message}`
      );
    }
  }

  async runBuildTest() {
    this.log('\n🔍 TESTING BUILD COMPILATION', 'bold');

    try {
      const { stdout, stderr } = await execAsync('npm run build 2>&1', { timeout: 60000 });

      if (stderr && stderr.includes('error')) {
        this.logResult(
          'Production build passes',
          false,
          `Build errors: ${stderr.substring(0, 200)}...`
        );
      } else {
        this.logResult(
          'Production build passes',
          true,
          'Build completed successfully'
        );
      }
    } catch (error) {
      this.logResult(
        'Production build passes',
        false,
        `Build failed: ${error.message}`
      );
    }
  }

  async generateReport() {
    this.log('\n📋 OAUTH IMPLEMENTATION VERIFICATION REPORT', 'bold');
    this.log('='.repeat(50), 'blue');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    this.log(`\n📊 SUMMARY:`, 'bold');
    this.log(`   Total Tests: ${totalTests}`);
    this.log(`   Passed: ${passedTests}`, 'green');
    this.log(`   Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    this.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (failedTests > 0) {
      this.log(`\n❌ FAILED TESTS:`, 'red');
      this.errors.forEach(error => {
        this.log(`   • ${error}`, 'red');
      });
    }

    if (failedTests === 0) {
      this.log(`\n🎉 ALL TESTS PASSED! OAuth implementation is ready.`, 'green');
    } else if (failedTests <= 2) {
      this.log(`\n⚠️  Minor issues detected. OAuth should work but may need attention.`, 'yellow');
    } else {
      this.log(`\n🚨 Significant issues detected. OAuth may not work properly.`, 'red');
    }

    this.log('\n🔧 NEXT STEPS:', 'bold');
    this.log('   1. If build passes: Test OAuth flow in browser');
    this.log('   2. Set GOOGLE_CLIENT_SECRET in Supabase Dashboard');
    this.log('   3. Register redirect URIs in Google Cloud Console');
    this.log('   4. Use Settings page OAuth diagnostics for runtime testing');

    this.log('\n' + '='.repeat(50), 'blue');
  }

  async run() {
    this.log('🚀 STARTING OAUTH IMPLEMENTATION VERIFICATION', 'bold');
    this.log('This script verifies the Google OAuth redirect_uri_mismatch fixes\n');

    await this.verifyRouting();
    await this.verifyOAuthConfiguration();
    await this.verifyDocumentation();
    await this.verifyIntegrationComponents();
    await this.verifySettings();
    await this.runBuildTest();
    await this.generateReport();
  }
}

// Run verification
const verifier = new OAuthVerifier();
verifier.run().catch(console.error);