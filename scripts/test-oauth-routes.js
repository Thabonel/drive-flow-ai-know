#!/usr/bin/env node
/**
 * OAuth Routes Testing Script
 *
 * Quick script to verify OAuth callback routes are working
 * Tests both regular and enhanced callback routes
 */

import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRoute(url, description) {
  return new Promise((resolve) => {
    log(`Testing: ${description}`, 'blue');
    log(`URL: ${url}`, 'blue');

    const curl = spawn('curl', [
      '-s',
      '-o', '/dev/null',
      '-w', '%{http_code}',
      url
    ]);

    let output = '';

    curl.stdout.on('data', (data) => {
      output += data.toString();
    });

    curl.on('close', (code) => {
      const httpCode = output.trim();
      const success = httpCode === '200';

      if (success) {
        log(`✅ PASS - Route responds with HTTP ${httpCode}`, 'green');
      } else {
        log(`❌ FAIL - Route responds with HTTP ${httpCode}`, 'red');
      }

      resolve(success);
    });

    curl.on('error', (error) => {
      log(`❌ ERROR - ${error.message}`, 'red');
      resolve(false);
    });
  });
}

async function checkDevServer() {
  log('🔍 Checking if development server is running...', 'bold');

  const isRunning = await testRoute('http://localhost:8080', 'Development server');

  if (!isRunning) {
    log('❌ Development server is not running!', 'red');
    log('Please start the dev server with: npm run dev', 'yellow');
    return false;
  }

  return true;
}

async function testOAuthRoutes() {
  log('\n🚀 OAUTH ROUTES TESTING', 'bold');
  log('='.repeat(40), 'blue');

  const serverRunning = await checkDevServer();
  if (!serverRunning) {
    return;
  }

  const routes = [
    {
      url: 'http://localhost:8080/auth/google/callback',
      description: 'Standard Google OAuth callback'
    },
    {
      url: 'http://localhost:8080/auth/google/enhanced-callback',
      description: 'Enhanced Google OAuth callback'
    }
  ];

  let passed = 0;
  let total = routes.length;

  log('\n📋 Testing OAuth callback routes:\n');

  for (const route of routes) {
    const success = await testRoute(route.url, route.description);
    if (success) passed++;
    log(''); // Empty line for readability
  }

  // Summary
  log('📊 SUMMARY:', 'bold');
  log(`   Total routes tested: ${total}`);
  log(`   Passed: ${passed}`, passed === total ? 'green' : 'red');
  log(`   Failed: ${total - passed}`, total - passed === 0 ? 'green' : 'red');

  if (passed === total) {
    log('\n🎉 All OAuth routes are working!', 'green');
  } else {
    log('\n⚠️  Some routes are not responding correctly.', 'yellow');
    log('This may be normal if:', 'yellow');
    log('   • Routes require authentication', 'yellow');
    log('   • Routes expect specific query parameters', 'yellow');
    log('   • Routes redirect (3xx responses)', 'yellow');
  }

  log('\n🔧 Next steps:', 'bold');
  log('   1. Test actual OAuth flow in browser');
  log('   2. Use Settings page OAuth diagnostics');
  log('   3. Run full verification: node scripts/verify-oauth-implementation.js');
}

// Run the test
testOAuthRoutes().catch(console.error);