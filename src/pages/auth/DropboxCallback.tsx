import { useEffect } from 'react';

/**
 * Dropbox OAuth callback page
 * This page receives the OAuth callback from Dropbox and sends the code back to the opener window
 */
const DropboxCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Send the result back to the opener window
    if (window.opener) {
      window.opener.postMessage({
        type: 'dropbox-oauth-callback',
        code,
        state,
        error: error || errorDescription,
      }, window.location.origin);

      // Close the popup
      window.close();
    } else {
      // If no opener, redirect to main app
      window.location.href = '/documents';
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Completing Dropbox connection...</p>
        <p className="text-sm text-muted-foreground mt-2">This window will close automatically.</p>
      </div>
    </div>
  );
};

export default DropboxCallback;
