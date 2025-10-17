import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud } from 'lucide-react';

interface GoogleAuthCardProps {
  onSignIn: () => void;
}

const GoogleAuthCard = ({ onSignIn }: GoogleAuthCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to Google Drive</CardTitle>
        <CardDescription>
          Sign in with your Google account to access your Drive files and folders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>When you click the button below, you'll be asked to:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Sign in to your Google account</li>
            <li>Grant AI Query Hub read-only access to your Google Drive</li>
            <li>Select which folders you want to sync</li>
          </ol>
          <p className="text-xs mt-2">We only request read-only access - we cannot modify or delete your files.</p>
        </div>
        <Button onClick={onSignIn} size="lg" className="w-full">
          <Cloud className="h-4 w-4 mr-2" />
          Connect Google Drive
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoogleAuthCard;