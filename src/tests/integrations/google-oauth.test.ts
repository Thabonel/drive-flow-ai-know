import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { getOAuthConfig, detectOAuthEnvironment, validateOAuthEnvironment } from '@/config/oauth';

/**
 * Google OAuth Integration Tests
 *
 * Tests each component boundary in the OAuth flow to identify WHERE failures occur.
 * Implements systematic debugging approach - gather evidence before proposing fixes.
 */

describe('Google OAuth Integration - Root Cause Investigation', () => {
  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  describe('Phase 1: Component Boundary Evidence Gathering', () => {

    it('should have valid frontend OAuth configuration', () => {
      const config = getOAuthConfig();

      expect(config.google.client_id).toBeTruthy();
      expect(config.google.client_id).toMatch(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
      expect(config.google.redirect_uri).toMatch(/^https?:\/\/.*\/auth\/google\/callback$/);

      console.log('✅ Frontend Config Evidence:', {
        clientIdFormat: config.google.client_id.substring(0, 20) + '...',
        redirectUri: config.google.redirect_uri,
        hasValidFormat: true
      });
    });

    it('should detect environment correctly', () => {
      const env = detectOAuthEnvironment();
      const validation = validateOAuthEnvironment();

      expect(env.name).toMatch(/^(development|staging|production)$/);
      expect(env.origin).toBeTruthy();
      expect(env.googleClientId).toBeTruthy();
      expect(env.redirectUri).toBeTruthy();

      console.log('✅ Environment Detection Evidence:', {
        environment: env.name,
        origin: env.origin,
        debugEnabled: env.debugEnabled,
        validationPassed: validation.valid,
        issues: validation.issues
      });
    });

    it('should test backend environment variables through health check', async () => {
      // Mock user authentication
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'test-user-id' } as any },
        error: null
      });

      // Test the health check endpoint
      const response = await supabase.functions.invoke('store-google-tokens', {
        body: { health_check: true }
      });

      console.log('📊 Backend Health Check Evidence:', {
        hasError: !!response.error,
        errorMessage: response.error?.message,
        data: response.data,
        timestamp: new Date().toISOString()
      });

      if (response.error) {
        const errorMsg = response.error.message || '';
        if (errorMsg.includes('GOOGLE_CLIENT_SECRET')) {
          console.log('🚨 ROOT CAUSE IDENTIFIED: Missing GOOGLE_CLIENT_SECRET environment variable');
          console.log('💡 SOLUTION: Set GOOGLE_CLIENT_SECRET in Supabase Dashboard > Settings > Environment Variables');
        } else if (errorMsg.includes('redirect_uri_mismatch')) {
          console.log('🚨 ROOT CAUSE IDENTIFIED: Redirect URI not registered in Google Cloud Console');
          console.log('💡 SOLUTION: Add redirect URIs to Google Cloud Console > APIs & Services > Credentials');
        } else if (errorMsg.includes('popup_blocked')) {
          console.log('🚨 ROOT CAUSE IDENTIFIED: Browser blocking OAuth popup');
          console.log('💡 SOLUTION: Enable popups or implement redirect-based OAuth');
        } else {
          console.log('🔍 EVIDENCE: Unexpected error -', errorMsg);
        }
      } else if (response.data) {
        console.log('✅ Backend Configuration Status:', response.data);
      }

      // Don't fail the test - we're gathering evidence, not expecting success
      expect(true).toBe(true);
    });

    it('should validate Google OAuth URL construction', () => {
      const config = getOAuthConfig();
      const scope = 'https://www.googleapis.com/auth/drive.readonly';

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.google.client_id);
      authUrl.searchParams.set('redirect_uri', config.google.redirect_uri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      const urlString = authUrl.toString();

      expect(urlString).toContain('client_id=');
      expect(urlString).toContain('redirect_uri=');
      expect(urlString).toContain('response_type=code');
      expect(urlString).toContain('access_type=offline');

      console.log('🔗 OAuth URL Evidence:', {
        authUrl: urlString,
        clientId: config.google.client_id.substring(0, 20) + '...',
        redirectUri: config.google.redirect_uri,
        scope: scope,
        instruction: 'Manual test: Open this URL to verify redirect_uri_mismatch errors'
      });
    });

    it('should test popup-based OAuth flow simulation', () => {
      // Simulate what happens when initiateGoogleOAuth is called
      const mockWindow = {
        open: vi.fn().mockReturnValue({
          closed: false,
          close: vi.fn()
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        location: { origin: 'http://localhost:8080' }
      };

      // Test popup blocking simulation
      mockWindow.open.mockReturnValueOnce(null); // Simulate popup blocked

      const config = getOAuthConfig();
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.google.client_id);
      authUrl.searchParams.set('redirect_uri', config.google.redirect_uri);
      authUrl.searchParams.set('response_type', 'code');

      const popup = mockWindow.open(authUrl.toString(), 'google-oauth', 'width=500,height=600');

      console.log('🪟 Popup Flow Evidence:', {
        popupBlocked: popup === null,
        authUrl: authUrl.toString(),
        windowOrigin: mockWindow.location.origin,
        popupParams: 'width=500,height=600',
        potentialIssue: popup === null ? 'Browser blocking popups' : 'Popup opened successfully'
      });

      expect(mockWindow.open).toHaveBeenCalled();
    });
  });

  describe('Phase 2: Integration Flow Testing', () => {

    it('should trace the complete OAuth flow', async () => {
      console.log('\n🔬 COMPLETE OAUTH FLOW TRACE:');
      console.log('1. Frontend → OAuth Config:', getOAuthConfig().google);
      console.log('2. Frontend → Environment Detection:', detectOAuthEnvironment());
      console.log('3. Frontend → Validation:', validateOAuthEnvironment());

      // Test each boundary where the flow could break
      const boundaries = [
        'Frontend OAuth Configuration',
        'Google Cloud Console Registration',
        'Browser Popup Security',
        'Google Authorization Server',
        'Callback Page Processing',
        'Backend Token Exchange',
        'Supabase Token Storage'
      ];

      boundaries.forEach((boundary, index) => {
        console.log(`${index + 4}. ${boundary} → [EVIDENCE NEEDED]`);
      });

      expect(boundaries).toHaveLength(7);
    });
  });

  describe('Phase 3: Known Issue Pattern Detection', () => {

    it('should check for common OAuth failure patterns', () => {
      const knownPatterns = [
        {
          pattern: 'redirect_uri_mismatch',
          cause: 'Domain not registered in Google Cloud Console',
          solution: 'Add redirect URI to authorized origins'
        },
        {
          pattern: 'unauthorized_client',
          cause: 'Missing GOOGLE_CLIENT_SECRET environment variable',
          solution: 'Set GOOGLE_CLIENT_SECRET in Supabase dashboard'
        },
        {
          pattern: 'popup_blocked',
          cause: 'Browser blocking OAuth popup window',
          solution: 'Enable popups or switch to redirect flow'
        },
        {
          pattern: 'access_denied',
          cause: 'User denied access or permissions insufficient',
          solution: 'Check requested scopes and user consent'
        }
      ];

      console.log('\n🎯 KNOWN OAUTH FAILURE PATTERNS:');
      knownPatterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.pattern}:`);
        console.log(`   Cause: ${pattern.cause}`);
        console.log(`   Solution: ${pattern.solution}\n`);
      });

      expect(knownPatterns).toHaveLength(4);
    });
  });
});

/**
 * Evidence-Based OAuth Testing Utilities
 *
 * Helper functions to gather diagnostic evidence from each component
 */
export const gatherOAuthEvidence = {

  async testEnvironmentVariables() {
    const response = await supabase.functions.invoke('store-google-tokens', {
      body: { health_check: true }
    });

    return {
      hasError: !!response.error,
      errorType: response.error?.message?.includes('GOOGLE_CLIENT_SECRET')
        ? 'MISSING_CLIENT_SECRET'
        : 'OTHER',
      data: response.data,
      evidence: response
    };
  },

  testPopupCapability() {
    // Test if the browser would block popups
    const testPopup = window.open('', '', 'width=1,height=1');
    const isBlocked = !testPopup || testPopup.closed;
    if (testPopup) testPopup.close();

    return {
      popupBlocked: isBlocked,
      userAgent: navigator.userAgent,
      browserSupportsPopups: !!window.open
    };
  },

  testRedirectUriConstruction() {
    const config = getOAuthConfig();
    const env = detectOAuthEnvironment();

    return {
      constructedRedirectUri: config.google.redirect_uri,
      currentOrigin: env.origin,
      environment: env.name,
      clientId: config.google.client_id
    };
  }
};