import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface DropboxAuthCardProps {
  onSignIn: () => void;
  isSigningIn?: boolean;
}

const DropboxAuthCard = ({ onSignIn, isSigningIn }: DropboxAuthCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 20l6 4 6-4-6-4-6 4z"/>
          </svg>
          Connect to Dropbox
        </CardTitle>
        <CardDescription>
          Sign in with your Dropbox account to access your files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your Dropbox account to browse, select, and sync files to your knowledge base.
          We'll only request read access to your files.
        </p>
        <Button onClick={onSignIn} className="w-full" disabled={isSigningIn}>
          {isSigningIn ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 20l6 4 6-4-6-4-6 4z"/>
              </svg>
              Sign in with Dropbox
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DropboxAuthCard;
