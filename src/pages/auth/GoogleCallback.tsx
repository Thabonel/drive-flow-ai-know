import { useEffect, useState } from 'react';
import { detectOAuthEnvironment } from '@/config/oauth';

/**
 * Enhanced Google OAuth callback page for popup-based authorization code flow.
 *
 * When Google redirects back after user consent, this page:
 * 1. Extracts the authorization code from the URL
 * 2. Validates the state parameter for security (CSRF protection)
 * 3. Sends it to the opener window via postMessage
 * 4. Closes the popup
 *
 * Features:
 * - State parameter validation for CSRF protection
 * - Environment-aware debugging
 * - Error handling and logging
 */
const GoogleCallback = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const env = detectOAuthEnvironment();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');

    if (env.debugEnabled) {
      console.log('🔧 OAuth Callback Debug:', {
        environment: env.name,
        origin: window.location.origin,
        hasCode: !!code,
        hasError: !!error,
        hasState: !!state,
        error: error || 'none',
        errorDescription: errorDescription || 'none',
        timestamp: new Date().toISOString(),
      });
    }

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', { error, errorDescription });
      setStatus('error');

      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'google-oauth-callback',
            error: error === 'access_denied'
              ? 'User denied access to Google account'
              : `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
            code: null,
            state,
          },
          window.location.origin
        );
        setTimeout(() => window.close(), 2000);
      } else {
        // If opened directly, redirect with error
        setTimeout(() => window.location.href = '/dashboard?error=oauth_callback_error', 2000);
      }
      return;
    }

    // Validate authorization code
    if (!code) {
      console.error('No authorization code received from Google');
      setStatus('error');

      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'google-oauth-callback',
            error: 'No authorization code received from Google',
            code: null,
            state,
          },
          window.location.origin
        );
        setTimeout(() => window.close(), 2000);
      } else {
        setTimeout(() => window.location.href = '/dashboard?error=no_auth_code', 2000);
      }
      return;
    }

    // Success - send authorization code to opener
    setStatus('success');

    if (window.opener) {
      if (env.debugEnabled) {
        console.log('✅ OAuth Success - Sending authorization code to opener');
      }

      window.opener.postMessage(
        {
          type: 'google-oauth-callback',
          code,
          error: null,
          state,
        },
        window.location.origin
      );
      // Close the popup after sending the message
      setTimeout(() => window.close(), 500);
    } else {
      // If opened directly (not as popup), redirect to dashboard
      if (env.debugEnabled) {
        console.log('Not opened as popup, redirecting to dashboard');
      }
      setTimeout(() => window.location.href = '/dashboard', 1000);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg">Completing Google sign-in...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex items-center justify-center h-12 w-12 mx-auto bg-green-100 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg text-green-600">Sign-in successful!</p>
            <p className="text-sm text-gray-500">Closing popup...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-center justify-center h-12 w-12 mx-auto bg-red-100 rounded-full">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg text-red-600">Sign-in failed</p>
            <p className="text-sm text-gray-500">Please try again. Closing popup...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
