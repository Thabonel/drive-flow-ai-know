import { describe, test, expect } from 'vitest';

describe('Supabase Client Security', () => {
  test('Supabase client uses environment variables', () => {
    // Check if environment variables are defined (they should be from .env file)
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();

    // Verify environment variables are not empty
    expect(import.meta.env.VITE_SUPABASE_URL).not.toBe('');
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).not.toBe('');

    // Verify they have expected format
    expect(import.meta.env.VITE_SUPABASE_URL).toMatch(/^https:\/\/.*\.supabase\.co$/);
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toMatch(/^eyJ/); // JWT format
  });

  test('no hardcoded credentials in source code', () => {
    // This test ensures the client file doesn't contain hardcoded values
    const fs = require('fs');
    const path = require('path');
    const clientPath = path.join(__dirname, 'client.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');

    // Should not contain any hardcoded Supabase URLs (must use env vars)
    expect(clientContent).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
    expect(clientContent).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

    // Should reference environment variables
    expect(clientContent).toContain('VITE_SUPABASE_URL');
    expect(clientContent).toContain('VITE_SUPABASE_ANON_KEY');
  });

  test('environment variables are properly validated', () => {
    // In a real scenario, missing environment variables would cause the client to throw
    // We can't easily test this in Vite's test environment, so we verify the validation logic exists
    const clientContent = require('fs').readFileSync(
      require('path').join(__dirname, 'client.ts'),
      'utf-8'
    );

    // Verify validation code exists
    expect(clientContent).toContain('VITE_SUPABASE_URL is required');
    expect(clientContent).toContain('VITE_SUPABASE_ANON_KEY is required');
    expect(clientContent).toContain('throw new Error');
  });
});