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
import { supabase } from "@/integrations/supabase/client";
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
  CreditCard
} from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { offlineMode, setOfflineMode } = useUserSettings();

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
