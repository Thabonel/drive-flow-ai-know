/**
 * Test for production error handling
 *
 * This file can be used to manually test the error handling system.
 * Run these tests in different environments to verify behavior.
 */

import { handleEdgeFunctionError, safeEdgeFunctionCall } from './error-handling';
import { config } from '@/config/environment';

// Mock function that simulates Supabase Edge Function errors
export const mockFailingEdgeFunction = async (errorType: 'supabase' | 'config' | 'network') => {
  const errors = {
    supabase: new Error('Edge Function returned a non-2xx status code'),
    config: new Error('GOOGLE_CLIENT_SECRET environment variable is not set'),
    network: new Error('Failed to fetch')
  };

  throw errors[errorType];
};

// Test the error handling system
export const testErrorHandling = async () => {
  console.log(`🧪 Testing Error Handling in ${config.environment} environment`);

  // Test 1: Direct error handling
  console.log('\n1. Testing direct error handling...');
  try {
    await mockFailingEdgeFunction('supabase');
  } catch (error) {
    handleEdgeFunctionError(error, 'Test Direct Error', {
      userMessage: 'Test operation failed',
      showToast: false, // Don't show toast in tests
      reportToAdmin: false
    });
  }

  // Test 2: Safe wrapper
  console.log('\n2. Testing safe wrapper...');
  const { data, error } = await safeEdgeFunctionCall(
    () => mockFailingEdgeFunction('config'),
    'Test Safe Wrapper',
    {
      showToast: false,
      reportToAdmin: false
    }
  );

  console.log('Safe wrapper result:', { data, error });

  // Test 3: Environment-specific behavior
  console.log('\n3. Environment behavior:');
  console.log(`- Production: ${config.isProduction}`);
  console.log(`- Debug logging: ${config.features.enableDebugLogging}`);
  console.log(`- Show environment banner: ${config.branding.showEnvironmentBanner}`);

  console.log('\n✅ Error handling tests completed. Check console for logs.');
};

// Usage: Add this to any component to test
// import { testErrorHandling } from '@/lib/error-handling.test';
// testErrorHandling();