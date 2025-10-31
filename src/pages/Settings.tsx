import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { useAssistantRelationships } from "@/hooks/useAssistantData";
import { useUserRole, usePendingApprovals, useHasAssistantFeatures } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";
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
  Users,
  ExternalLink
} from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { offlineMode, setOfflineMode } = useUserSettings();
  const { theme, setTheme } = useTheme();

  // Fetch assistant data
  const { data: userRole } = useUserRole();
  const hasAssistantFeatures = useHasAssistantFeatures();
  const { data: myAssistants } = useAssistantRelationships(true, false);
  const { data: myExecutives } = useAssistantRelationships(false, true);
  const { data: pendingApprovals } = usePendingApprovals();

  // Memoize grid class to prevent layout shifts during loading
  const tabsGridClass = useMemo(() => {
    // Convert to stable boolean (undefined becomes false)
    const showTeamTab = Boolean(hasAssistantFeatures);
    return `grid w-full ${showTeamTab ? 'grid-cols-6' : 'grid-cols-5'}`;
  }, [hasAssistantFeatures]);

  useEffect(() => {
    if (location.hash === "#model-provider") {
      setActiveTab("ai");
    }
  }, [location.hash]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);

  // Check Google Drive connection status
  useEffect(() => {
    const checkGoogleDriveStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

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
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Change your account and app settings
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className={tabsGridClass}>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="ai">AI & Data</TabsTrigger>
                {hasAssistantFeatures && (
                  <TabsTrigger value="team">
                    <div className="flex items-center gap-1">
                      Team
                      {pendingApprovals && pendingApprovals.length > 0 && (
                        <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {pendingApprovals.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                )}
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
                          { value: "system", label: "System preference", icon: "💻" },
                          { value: "light", label: "Light", icon: "☀️" },
                          { value: "pure-light", label: "Pure Light", icon: "✨" },
                          { value: "dark", label: "Dark", icon: "🌙" },
                          { value: "magic-blue", label: "Magic Blue", icon: "🔷" },
                          { value: "classic-dark", label: "Classic Dark", icon: "⬛" },
                        ].map(({ value, label, icon }) => (
                          <button
                            key={value}
                            onClick={() => setTheme(value as any)}
                            className={`
                              flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                              hover:border-primary hover:bg-accent/50
                              ${theme === value ? 'border-primary bg-accent' : 'border-border'}
                            `}
                          >
                            <span className="text-xl">{icon}</span>
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
                <PersonalPrompt />
              </TabsContent>

              <TabsContent value="team" className="space-y-6 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team & Assistants
                    </CardTitle>
                    <CardDescription>
                      Manage assistant relationships and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userRole?.role_type === "executive" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">My Assistants</h3>
                            <p className="text-sm text-muted-foreground">
                              {myAssistants?.length || 0} assistant{myAssistants?.length !== 1 ? 's' : ''} configured
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/assistants')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Manage All
                          </Button>
                        </div>

                        {pendingApprovals && pendingApprovals.length > 0 && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                              {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Review new assistant relationship requests
                            </p>
                          </div>
                        )}

                        {myAssistants && myAssistants.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium">Assistant</th>
                                  <th className="text-left p-3 text-sm font-medium">Status</th>
                                  <th className="text-left p-3 text-sm font-medium">Permissions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {myAssistants.slice(0, 5).map((rel: any) => (
                                  <tr key={rel.id} className="hover:bg-muted/30">
                                    <td className="p-3">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {rel.assistant?.raw_user_meta_data?.full_name || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {rel.assistant?.email}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant={rel.status === 'active' ? 'default' : rel.status === 'pending' ? 'secondary' : 'outline'}>
                                        {rel.status}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                        {rel.permissions?.manage_timeline && (
                                          <Badge variant="outline" className="text-xs">Timeline</Badge>
                                        )}
                                        {rel.permissions?.upload_documents && (
                                          <Badge variant="outline" className="text-xs">Docs</Badge>
                                        )}
                                        {rel.permissions?.view_confidential && (
                                          <Badge variant="outline" className="text-xs">Confidential</Badge>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 border rounded-lg border-dashed">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              No assistants configured yet
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => navigate('/assistants')}
                            >
                              Invite Assistant
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {userRole?.role_type === "assistant" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">My Executives</h3>
                            <p className="text-sm text-muted-foreground">
                              {myExecutives?.length || 0} executive{myExecutives?.length !== 1 ? 's' : ''} assigned
                            </p>
                          </div>
                        </div>

                        {myExecutives && myExecutives.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium">Executive</th>
                                  <th className="text-left p-3 text-sm font-medium">Your Permissions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {myExecutives.map((rel: any) => (
                                  <tr key={rel.id} className="hover:bg-muted/30">
                                    <td className="p-3">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {rel.executive?.raw_user_meta_data?.full_name || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {rel.executive?.email}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                        {rel.permissions?.manage_timeline && (
                                          <Badge variant="outline" className="text-xs">Timeline</Badge>
                                        )}
                                        {rel.permissions?.upload_documents && (
                                          <Badge variant="outline" className="text-xs">Docs</Badge>
                                        )}
                                        {rel.permissions?.create_items && (
                                          <Badge variant="outline" className="text-xs">Create</Badge>
                                        )}
                                        {rel.permissions?.edit_items && (
                                          <Badge variant="outline" className="text-xs">Edit</Badge>
                                        )}
                                        {rel.permissions?.delete_items && (
                                          <Badge variant="outline" className="text-xs">Delete</Badge>
                                        )}
                                        {rel.permissions?.view_confidential && (
                                          <Badge variant="outline" className="text-xs">Confidential</Badge>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 border rounded-lg border-dashed">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Not assigned to any executives yet
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {userRole?.role_type === "standard" && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Assistant features are only available for Executive and Assistant roles
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Subscription Tier</p>
                          <p className="text-xs text-muted-foreground">
                            {userRole?.subscription_tier || 'starter'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Max Assistants</p>
                          <p className="text-xs text-muted-foreground">
                            {userRole?.features_enabled?.max_assistants || 0}
                          </p>
                        </div>
                      </div>
                    </div>
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
