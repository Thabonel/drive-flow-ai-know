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
          Sign in to your Google account to browse and select files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onSignIn}>
          <Cloud className="h-4 w-4 mr-2" />
          Sign in to Google Drive
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoogleAuthCard;
