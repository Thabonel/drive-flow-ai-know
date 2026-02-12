import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useUserSettings } from "@/hooks/useUserSettings";
import EnterpriseServer from "./Settings/EnterpriseServer";
import Billing from "./Settings/Billing";
import { PersonalPrompt } from "@/components/PersonalPrompt";
import { PageHelp } from "@/components/PageHelp";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { SettingsAIAssistant } from "@/components/settings/SettingsAIAssistant";
import { AgentModeToggle } from "@/components/settings/AgentModeToggle";
import { MemoryManager } from "@/components/settings/MemoryManager";
import { MFASettings } from "@/components/settings/MFASettings";
import { MessagingIntegrations } from "@/components/settings/MessagingIntegrations";
import {
  User,
  Bell,
  Shield,
  Trash2,
  Download,
  Upload,
  Brain,
  Database,
  Server,
  CreditCard,
  Palette,
  Check,
  Cookie
} from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { offlineMode, setOfflineMode } = useUserSettings();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (location.hash === "#model-provider") {
      setActiveTab("ai");
    }
  }, [location.hash]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);

  // Privacy consent state
  const [privacyConsent, setPrivacyConsent] = useState({
    accepted: false,
    analytics: false,
    marketing: false,
  });

  // Load privacy consent on mount
  useEffect(() => {
    const existingConsent = localStorage.getItem('privacy-consent-v1');
    if (existingConsent) {
      try {
        const parsed = JSON.parse(existingConsent);
        setPrivacyConsent({
          accepted: parsed.accepted || false,
          analytics: parsed.analytics || false,
          marketing: parsed.marketing || false,
        });
      } catch {
        // Invalid consent data
      }
    }
  }, []);

  const savePrivacyPreferences = () => {
    const consentRecord = {
      version: 'v1',
      accepted: true,
      essential: true,
      analytics: privacyConsent.analytics,
      marketing: privacyConsent.marketing,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('privacy-consent-v1', JSON.stringify(consentRecord));
    setPrivacyConsent({ ...privacyConsent, accepted: true });
    toast({
      title: "Privacy Preferences Saved",
      description: "Your privacy settings have been updated.",
    });
  };

  const withdrawPrivacyConsent = () => {
    localStorage.removeItem('privacy-consent-v1');
    setPrivacyConsent({
      accepted: false,
      analytics: false,
      marketing: false,
    });
    toast({
      title: "Consent Withdrawn",
      description: "Your privacy consent has been withdrawn. You may see the consent banner again.",
    });
  };

  // Check Google Drive connection status
  useEffect(() => {
    const checkGoogleDriveStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      setGoogleDriveConnected(!error && !!data);
    };

    checkGoogleDriveStatus();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const fullNameInput = document.getElementById('full-name') as HTMLInputElement;
      const bioInput = document.getElementById('bio') as HTMLTextAreaElement;

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullNameInput?.value || '',
          bio: bioInput?.value || '',
        }
      });

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportData = () => {
    // TODO: Implement data export functionality
    toast({
      title: 'Coming Soon',
      description: 'Data export functionality will be available in a future update.',
    });
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion workflow
    toast({
      title: 'Account Deletion',
      description: 'Please contact support@aiqueryhub.com to delete your account.',
      variant: 'destructive',
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 space-y-8">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                  Change your account and app settings
                </p>
              </div>
              <PageHelp
                title="Settings Help"
                description="Customize your AI Query Hub experience across five settings tabs. Configure your profile, billing, AI behavior, security, and enterprise connections."
                tips={[
                  "General: Edit profile (name, bio), choose theme, view account status",
                  "Billing: View subscription plan and manage payments",
                  "AI & Data: Set your personal AI prompt to customize AI responses",
                  "Security: Enable offline mode, view connected services, export/import data",
                  "Enterprise: Connect to enterprise servers for team access",
                  "Use the Settings Assistant to get help configuring your account and preferences"
                ]}
              />
            </div>

            {/* AI Assistant */}
            <SettingsAIAssistant />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="ai">AI & Data</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Edit your profile info
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input
                          id="full-name"
                          defaultValue={user?.user_metadata?.full_name || ''}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue={user?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Appearance
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of the application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { value: "system", label: "System preference" },
                          { value: "light", label: "Light" },
                          { value: "pure-light", label: "Pure Light" },
                          { value: "dark", label: "Dark" },
                          { value: "magic-blue", label: "Magic Blue" },
                          { value: "classic-dark", label: "Classic Dark" },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setTheme(value as any)}
                            className={`
                              flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                              hover:border-primary hover:bg-accent/50
                              ${theme === value ? 'border-primary bg-accent' : 'border-border'}
                            `}
                          >
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">{label}</div>
                            </div>
                            {theme === value && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Plan</span>
                        <Badge variant="outline">Free</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Storage Used</span>
                        <span className="text-sm">0 MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Member Since</span>
                        <span className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications tab hidden until email functionality is implemented */}

              <TabsContent value="billing" className="space-y-6 w-full">
                <Billing />
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Agent Mode
                    </CardTitle>
                    <CardDescription>
                      Enable autonomous AI assistance for proactive task management
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user && <AgentModeToggle userId={user.id} />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Memory
                    </CardTitle>
                    <CardDescription>
                      Facts the AI remembers about you from previous conversations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user && <MemoryManager userId={user.id} />}
                  </CardContent>
                </Card>

                <PersonalPrompt />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Messaging Integrations
                    </CardTitle>
                    <CardDescription>
                      Connect Telegram or Slack to chat with your AI assistant on the go
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user && <MessagingIntegrations userId={user.id} />}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Offline Mode
                    </CardTitle>
                    <CardDescription>
                      Enable offline access to your documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="offline-mode">Offline Mode</Label>
                      <Switch
                        id="offline-mode"
                        checked={offlineMode}
                        onCheckedChange={setOfflineMode}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Multi-Factor Authentication */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-primary">Multi-Factor Authentication</h3>
                  <MFASettings />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Privacy & Security
                    </CardTitle>
                    <CardDescription>
                      Manage your privacy settings and account security
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Connected Services</Label>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">G</span>
                          </div>
                          <div>
                            <p className="font-medium">Google Drive</p>
                            <p className="text-sm text-muted-foreground">
                              {googleDriveConnected ? 'Connected' : 'Not Connected'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={googleDriveConnected ? "default" : "secondary"}>
                          {googleDriveConnected ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cookie className="h-5 w-5" />
                      Privacy Preferences
                    </CardTitle>
                    <CardDescription>
                      Manage your cookie and data collection preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Essential</h4>
                          <p className="text-sm text-muted-foreground">
                            Required for the application to function
                          </p>
                        </div>
                        <Switch checked={true} disabled={true} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Analytics</h4>
                          <p className="text-sm text-muted-foreground">
                            Help us improve the service
                          </p>
                        </div>
                        <Switch
                          checked={privacyConsent.analytics}
                          onCheckedChange={(checked) =>
                            setPrivacyConsent({ ...privacyConsent, analytics: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive personalized recommendations
                          </p>
                        </div>
                        <Switch
                          checked={privacyConsent.marketing}
                          onCheckedChange={(checked) =>
                            setPrivacyConsent({ ...privacyConsent, marketing: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={savePrivacyPreferences} className="flex-1">
                        Save Preferences
                      </Button>
                      {privacyConsent.accepted && (
                        <Button
                          onClick={withdrawPrivacyConsent}
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                        >
                          Withdraw Consent
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>
                      Export or manage your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full" onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                    <Separator />
                    <Button variant="destructive" className="w-full" onClick={handleDeleteAccount}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="enterprise" className="w-full">
                <EnterpriseServer />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
