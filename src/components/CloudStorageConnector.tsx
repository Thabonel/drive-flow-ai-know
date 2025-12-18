import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Apple,
  Cloud,
  HardDrive,
  Link,
  ExternalLink,
  Info,
  Settings,
  CheckCircle,
  AlertTriangle,
  Database,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropbox } from '@/hooks/useDropbox';
import { useMicrosoft } from '@/hooks/useMicrosoft';

interface CloudStorageConnectorProps {
  onConnectionEstablished: (connection: any) => void;
}

const CloudStorageConnector = ({ onConnectionEstablished }: CloudStorageConnectorProps) => {
  const [connections, setConnections] = useState<any[]>([]);
  const { toast } = useToast();

  // Real integration hooks
  const {
    isAuthenticated: dropboxConnected,
    signIn: dropboxSignIn,
    disconnect: dropboxDisconnect,
    isSigningIn: dropboxLoading
  } = useDropbox();

  const {
    isAuthenticated: microsoftConnected,
    signIn: microsoftSignIn,
    disconnect: microsoftDisconnect,
    isSigningIn: microsoftLoading
  } = useMicrosoft();

  const cloudServices = [
    {
      id: 'icloud',
      name: 'iCloud Drive',
      description: 'Access files from your Apple iCloud',
      icon: Apple,
      status: 'coming_soon',
      color: 'text-gray-600',
      instructions: 'Web API access limited. Use iCloud.com for now.',
      helpUrl: 'https://www.icloud.com/'
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Sync with your Dropbox folders',
      icon: Database,
      status: 'available',
      color: 'text-blue-600',
      instructions: 'Connect via Dropbox API integration.',
      helpUrl: 'https://dropbox.com/developers'
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      description: 'Microsoft OneDrive integration',
      icon: HardDrive,
      status: 'available',
      color: 'text-blue-500',
      instructions: 'Connect via Microsoft Graph API.',
      helpUrl: 'https://onedrive.live.com/'
    },
    {
      id: 'box',
      name: 'Box',
      description: 'Enterprise file sharing platform',
      icon: HardDrive,
      status: 'coming_soon',
      color: 'text-blue-700',
      instructions: 'Box API integration coming soon.',
      helpUrl: 'https://box.com/'
    }
  ];

  // Helper to check if a service is connected
  const isServiceConnected = (serviceId: string) => {
    if (serviceId === 'dropbox') return dropboxConnected;
    if (serviceId === 'onedrive') return microsoftConnected;
    return false;
  };

  // Helper to check if a service is loading
  const isServiceLoading = (serviceId: string) => {
    if (serviceId === 'dropbox') return dropboxLoading;
    if (serviceId === 'onedrive') return microsoftLoading;
    return false;
  };

  const handleConnect = async (serviceId: string) => {
    const service = cloudServices.find(s => s.id === serviceId);
    if (!service) return;

    if (service.status === 'coming_soon') {
      toast({
        title: 'Coming Soon',
        description: `${service.name} integration is currently in development.`,
      });
      return;
    }

    if (serviceId === 'dropbox') {
      await dropboxSignIn();
      return;
    }

    if (serviceId === 'onedrive') {
      await microsoftSignIn();
      return;
    }

    // Generic handler for other services
    toast({
      title: 'Integration Coming Soon',
      description: `${service.name} integration will be available in a future update.`,
    });
  };

  const handleDisconnect = async (serviceId: string) => {
    if (serviceId === 'dropbox') {
      await dropboxDisconnect();
    } else if (serviceId === 'onedrive') {
      await microsoftDisconnect();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default">Available</Badge>;
      case 'coming_soon':
        return <Badge variant="outline">Coming Soon</Badge>;
      case 'beta':
        return <Badge variant="secondary">Beta</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Connect your cloud storage accounts to automatically sync documents.
          Some integrations are still in development.
        </AlertDescription>
      </Alert>

      {/* Available Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cloudServices.map((service) => {
          const isConnected = isServiceConnected(service.id);
          const isLoading = isServiceLoading(service.id);

          return (
            <Card key={service.id} className={`${isConnected ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <service.icon className={`h-6 w-6 ${service.color}`} />
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge variant="default" className="bg-green-600">Connected</Badge>
                  ) : (
                    getStatusBadge(service.status)
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {service.instructions}
                </p>

                <div className="flex items-center justify-between">
                  <Button
                    variant={isConnected ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleConnect(service.id)}
                    disabled={isConnected || isLoading || service.status === 'coming_soon'}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : isConnected ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={service.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Learn More
                    </a>
                  </Button>
                </div>

                {isConnected && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Active Connection
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Network Folders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Network & Enterprise Storage
          </CardTitle>
          <CardDescription>
            Connect to network drives, SharePoint, and enterprise storage systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>
                <strong>Network folder access requires additional setup:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Install our desktop companion app for network drive access</li>
                <li>Configure VPN or direct network connectivity</li>
                <li>Set up authentication for enterprise systems</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Network Setup (Coming Soon)
            </Button>
            <Button variant="outline" disabled>
              <ExternalLink className="h-4 w-4 mr-2" />
              SharePoint Integration (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudStorageConnector;
