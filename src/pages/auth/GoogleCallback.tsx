import { useEffect } from 'react';

/**
 * Google OAuth callback page for popup-based authorization code flow.
 *
 * When Google redirects back after user consent, this page:
 * 1. Extracts the authorization code from the URL
 * 2. Sends it to the opener window via postMessage
 * 3. Closes the popup
 */
const GoogleCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'google-oauth-callback',
          code,
          error,
          state,
        },
        window.location.origin
      );
      // Close the popup after sending the message
      setTimeout(() => window.close(), 500);
    } else {
      // If opened directly (not as popup), redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-lg">Completing Google sign-in...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
