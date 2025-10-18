import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Server, MessageSquare, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ServerConfig = {
  protocol: "sftp" | "webdav" | "s3" | "azure_files" | "azure_blob";
  host: string;
  port: string;
  authMethod: "username_password" | "ssh_key" | "oauth" | "api_key" | "certificate" | "active_directory";
  username: string;
  password: string;
  privateKey: string;
};

export default function EnterpriseServer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    protocol: "sftp",
    host: "",
    port: "",
    authMethod: "username_password",
    username: "",
    password: "",
    privateKey: "",
  });

  const sendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessages: Message[] = [
      ...chatMessages,
      { role: 'user', content: userMessage }
    ];
    setChatMessages(newMessages);
    setUserMessage("");
    setLoading(true);

    try {
      // Use the main ai-query function instead of enterprise-specific one
      const systemContext = `You are an AI assistant helping configure enterprise server connections. Current config: Protocol: ${serverConfig.protocol}, Host: ${serverConfig.host || 'not set'}, Auth: ${serverConfig.authMethod}. Guide the user step-by-step with setup.`;

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: `${systemContext}\n\nUser question: ${userMessage}`,
          conversationContext: newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      const aiResponse = data?.response || 'Sorry, I could not help with that. Please try again.';
      setChatMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // First, store the credentials securely
      const credentials = serverConfig.authMethod === 'username_password' 
        ? JSON.stringify({ username: serverConfig.username, password: serverConfig.password })
        : JSON.stringify({ username: serverConfig.username, privateKey: serverConfig.privateKey });

      const { data: configData, error: configError } = await supabase
        .from('enterprise_server_configs')
        .insert({
          user_id: user!.id,
          name: `${serverConfig.protocol.toUpperCase()} Server`,
          protocol: serverConfig.protocol,
          host: serverConfig.host,
          port: serverConfig.port ? parseInt(serverConfig.port) : null,
          auth_method: serverConfig.authMethod,
        })
        .select()
        .single();

      if (configError) throw configError;

      // Store encrypted credentials
      const { error: credError } = await supabase.rpc('store_encrypted_server_credentials', {
        p_config_id: configData.id,
        p_credentials: credentials
      });

      if (credError) throw credError;

      toast({
        title: "Success",
        description: "Enterprise server configuration saved securely.",
      });

      // Reset form
      setServerConfig({
        protocol: "sftp",
        host: "",
        port: "",
        authMethod: "username_password",
        username: "",
        password: "",
        privateKey: "",
      });
      setChatMessages([]);
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Enterprise Server Setup</h2>
        <p className="text-muted-foreground">
          Configure secure connections to your enterprise document servers
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        {/* AI Assistant Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Setup Assistant
            </CardTitle>
            <CardDescription>
              Get guided help configuring your enterprise server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[500px] rounded-md border p-4">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Ask the AI assistant for help setting up your server connection
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Ask for setup guidance..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !userMessage.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Server Configuration
            </CardTitle>
            <CardDescription>
              Enter your enterprise server details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Select
                value={serverConfig.protocol}
                onValueChange={(value) => setServerConfig({ ...serverConfig, protocol: value as ServerConfig['protocol'] })}
              >
                <SelectTrigger id="protocol">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s3">Amazon S3</SelectItem>
                  <SelectItem value="azure_files">Azure Files</SelectItem>
                  <SelectItem value="azure_blob">Azure Blob</SelectItem>
                  <SelectItem value="sftp">SFTP</SelectItem>
                  <SelectItem value="webdav">WebDAV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                placeholder="server.example.com"
                value={serverConfig.host}
                onChange={(e) => setServerConfig({ ...serverConfig, host: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port (optional)</Label>
              <Input
                id="port"
                type="number"
                placeholder="22"
                value={serverConfig.port}
                onChange={(e) => setServerConfig({ ...serverConfig, port: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authMethod">Authentication Method</Label>
              <Select
                value={serverConfig.authMethod}
                onValueChange={(value) => setServerConfig({ ...serverConfig, authMethod: value as ServerConfig['authMethod'] })}
              >
                <SelectTrigger id="authMethod">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username_password">Username/Password</SelectItem>
                  <SelectItem value="ssh_key">SSH Key</SelectItem>
                  <SelectItem value="oauth">OAuth 2.0</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="active_directory">Active Directory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={serverConfig.username}
                onChange={(e) => setServerConfig({ ...serverConfig, username: e.target.value })}
              />
            </div>

            {serverConfig.authMethod === 'username_password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={serverConfig.password}
                  onChange={(e) => setServerConfig({ ...serverConfig, password: e.target.value })}
                />
              </div>
            ) : serverConfig.authMethod === 'ssh_key' ? (
              <div className="space-y-2">
                <Label htmlFor="privateKey">Private Key</Label>
                <Textarea
                  id="privateKey"
                  placeholder="Paste your private key here"
                  value={serverConfig.privateKey}
                  onChange={(e) => setServerConfig({ ...serverConfig, privateKey: e.target.value })}
                  rows={6}
                />
              </div>
            ) : null}

            <Button
              className="w-full"
              onClick={saveConfiguration}
              disabled={saving || !serverConfig.host || !serverConfig.username}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
