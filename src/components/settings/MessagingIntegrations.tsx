import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageCircle, Hash, Link2, Copy, Check, ExternalLink, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MessagingIntegrationsProps {
  userId: string;
}

interface TelegramConnection {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
  connected_at: string;
}

interface SlackConnection {
  id: string;
  slack_team_id: string;
  slack_team_name?: string;
  slack_channel_id?: string;
  slack_channel_name?: string;
  connected_at: string;
}

// Telegram bot username - should match your deployed bot
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot';

// Slack OAuth configuration
const SLACK_CLIENT_ID = import.meta.env.VITE_SLACK_CLIENT_ID || '';
const SLACK_REDIRECT_URI = import.meta.env.VITE_SLACK_REDIRECT_URI || `${window.location.origin}/settings/slack/callback`;
const SLACK_SCOPES = 'chat:write,channels:read,users:read';

export function MessagingIntegrations({ userId }: MessagingIntegrationsProps) {
  const [loading, setLoading] = useState(true);
  const [telegramConnection, setTelegramConnection] = useState<TelegramConnection | null>(null);
  const [slackConnection, setSlackConnection] = useState<SlackConnection | null>(null);
  const [linkingToken, setLinkingToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disconnecting, setDisconnecting] = useState<'telegram' | 'slack' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
  }, [userId]);

  const fetchConnections = async () => {
    try {
      // Fetch Telegram connection
      const { data: telegramData } = await supabase
        .from('user_messaging_connections')
        .select('id, telegram_chat_id, telegram_username, connected_at')
        .eq('user_id', userId)
        .eq('platform', 'telegram')
        .maybeSingle();

      if (telegramData) {
        setTelegramConnection(telegramData);
      }

      // Fetch Slack connection
      const { data: slackData } = await supabase
        .from('user_messaging_connections')
        .select('id, slack_team_id, slack_team_name, slack_channel_id, slack_channel_name, connected_at')
        .eq('user_id', userId)
        .eq('platform', 'slack')
        .maybeSingle();

      if (slackData) {
        setSlackConnection(slackData);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTelegramLinkingToken = async () => {
    setGeneratingToken(true);
    try {
      // Generate a secure random token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .slice(0, 32);

      // Store the token in database with expiry
      const { error } = await supabase
        .from('messaging_link_tokens')
        .upsert({
          user_id: userId,
          platform: 'telegram',
          token,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        }, {
          onConflict: 'user_id,platform',
        });

      if (error) throw error;

      setLinkingToken(token);
      toast({
        title: 'Link Generated',
        description: 'Click the link or scan QR code to connect Telegram. Link expires in 15 minutes.',
      });
    } catch (error) {
      console.error('Failed to generate token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate linking token',
        variant: 'destructive',
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleSlackConnect = () => {
    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('slack_oauth_state', state);

    // Redirect to Slack OAuth
    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      scope: SLACK_SCOPES,
      redirect_uri: SLACK_REDIRECT_URI,
      state,
    });

    window.location.href = `https://slack.com/oauth/v2/authorize?${params}`;
  };

  const disconnectPlatform = async (platform: 'telegram' | 'slack') => {
    setDisconnecting(platform);
    try {
      const { error } = await supabase
        .from('user_messaging_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) throw error;

      if (platform === 'telegram') {
        setTelegramConnection(null);
        setLinkingToken(null);
      } else {
        setSlackConnection(null);
      }

      toast({
        title: 'Disconnected',
        description: `${platform === 'telegram' ? 'Telegram' : 'Slack'} has been disconnected.`,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect platform',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const telegramDeepLink = linkingToken
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkingToken}`
    : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <MessageCircle className="h-4 w-4" />
        <AlertDescription>
          Connect messaging platforms to receive proactive check-ins and interact with your AI assistant on the go.
        </AlertDescription>
      </Alert>

      {/* Telegram Integration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0088cc] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Telegram</CardTitle>
                <CardDescription>
                  Chat with your assistant via Telegram
                </CardDescription>
              </div>
            </div>
            <Badge variant={telegramConnection ? 'default' : 'secondary'}>
              {telegramConnection ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {telegramConnection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {telegramConnection.telegram_username
                      ? `@${telegramConnection.telegram_username}`
                      : `Chat ID: ${telegramConnection.telegram_chat_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(telegramConnection.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disconnecting === 'telegram'}
                    >
                      {disconnecting === 'telegram' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      <span className="ml-2">Disconnect</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Telegram?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will no longer receive messages or check-ins via Telegram.
                        You can reconnect anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => disconnectPlatform('telegram')}>
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!linkingToken ? (
                <Button
                  onClick={generateTelegramLinkingToken}
                  disabled={generatingToken}
                  className="w-full"
                >
                  {generatingToken ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Connection Link
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Click link or copy to open in Telegram:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={telegramDeepLink || ''}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(telegramDeepLink || '')}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <a href={telegramDeepLink || '#'} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Telegram
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Link expires in 15 minutes. After clicking, press Start in Telegram to complete connection.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Integration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Slack</CardTitle>
                <CardDescription>
                  Get updates in your Slack workspace
                </CardDescription>
              </div>
            </div>
            <Badge variant={slackConnection ? 'default' : 'secondary'}>
              {slackConnection ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {slackConnection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {slackConnection.slack_team_name || slackConnection.slack_team_id}
                  </p>
                  {slackConnection.slack_channel_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {slackConnection.slack_channel_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(slackConnection.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disconnecting === 'slack'}
                    >
                      {disconnecting === 'slack' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      <span className="ml-2">Disconnect</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Slack?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will no longer receive messages in this Slack workspace.
                        You can reconnect anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => disconnectPlatform('slack')}>
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {SLACK_CLIENT_ID ? (
                <Button onClick={handleSlackConnect} className="w-full">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
                  </svg>
                  Add to Slack
                </Button>
              ) : (
                <Alert>
                  <AlertDescription className="text-sm">
                    Slack integration is not configured. Please set VITE_SLACK_CLIENT_ID in your environment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
