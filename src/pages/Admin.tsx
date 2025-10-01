import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Send, MessageSquare, Clock, CheckCircle, Users, UserPlus, 
  BarChart3, Activity, Database, FileText, Brain, Settings, 
  TrendingUp, AlertTriangle, Eye, Globe 
} from 'lucide-react';

interface AdminMessage {
  id: string;
  message_text: string;
  ai_response: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processed' | 'responded';
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalAdmins: number;
  totalDocuments: number;
  totalQueries: number;
  totalSyncJobs: number;
  recentActivity: any[];
  securityEvents: number;
  activeUsers: number;
}

interface AppSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailConfirmationEnabled: boolean;
  aiQueriesEnabled: boolean;
  documentSyncEnabled: boolean;
  maxDocumentsPerUser: number;
  maxQueriesPerDay: number;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    emailConfirmationEnabled: true,
    aiQueriesEnabled: true,
    documentSyncEnabled: true,
    maxDocumentsPerUser: 1000,
    maxQueriesPerDay: 100
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
    fetchMessages();
    fetchAnalytics();
    fetchSettings();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      setIsAdmin(roles && roles.length > 0);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Failed to verify admin access');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        priority: msg.priority as 'low' | 'normal' | 'high' | 'urgent',
        status: msg.status as 'pending' | 'processed' | 'responded'
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-command-center', {
        body: {
          message: messageText,
          priority: priority
        }
      });

      if (error) throw error;

      toast.success('Message sent to AI Command Center');
      setMessageText('');
      setPriority('normal');
      fetchMessages(); // Refresh the list
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message to command center');
    } finally {
      setSending(false);
    }
  };

  const grantAdminRole = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setGrantingAdmin(true);
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', newAdminEmail.trim())
        .single();

      if (userError || !userData) {
        toast.error('User not found. Make sure they have signed up first.');
        setGrantingAdmin(false);
        return;
      }

      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userData.user_id)
        .eq('role', 'admin')
        .single();

      if (existingRole) {
        toast.error('User already has admin privileges');
        setGrantingAdmin(false);
        return;
      }

      // Grant admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.user_id,
          role: 'admin'
        });

      if (roleError) throw roleError;

      toast.success(`Admin privileges granted to ${newAdminEmail}`);
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast.error('Failed to grant admin privileges');
    } finally {
      setGrantingAdmin(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processed': return <MessageSquare className="h-4 w-4" />;
      case 'responded': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch various analytics data
      const [
        usersResult,
        adminsResult,
        documentsResult,
        queriesResult,
        syncJobsResult,
        securityEventsResult,
        recentActivityResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'admin'),
        supabase.from('knowledge_documents').select('id', { count: 'exact' }),
        supabase.from('ai_query_history').select('id', { count: 'exact' }),
        supabase.from('sync_jobs').select('id', { count: 'exact' }),
        supabase.from('security_audit_log').select('id', { count: 'exact' }),
        supabase
          .from('ai_query_history')
          .select('created_at, query_text, user_id')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setAnalytics({
        totalUsers: usersResult.count || 0,
        totalAdmins: adminsResult.count || 0,
        totalDocuments: documentsResult.count || 0,
        totalQueries: queriesResult.count || 0,
        totalSyncJobs: syncJobsResult.count || 0,
        securityEvents: securityEventsResult.count || 0,
        activeUsers: usersResult.count || 0, // Could be enhanced with actual active user logic
        recentActivity: recentActivityResult.data || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchSettings = async () => {
    // In a real app, these would come from a settings table
    // For now, using default values
    try {
      // You could fetch from a settings table here
      console.log('Settings loaded with defaults');
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, you'd save this to a database
    toast.success('Setting updated successfully');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this page.
              {!loading && !user ? ' Please sign in first.' : ''}
            </CardDescription>
          </CardHeader>
          {!loading && !user && (
            <CardContent className="text-center">
              <Button onClick={() => window.location.href = '/auth'}>
                Go to Sign In
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive system management and analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Active platform users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Queries</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalQueries || 0}</div>
                <p className="text-xs text-muted-foreground">Total queries processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalDocuments || 0}</div>
                <p className="text-xs text-muted-foreground">Knowledge documents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.securityEvents || 0}</div>
                <p className="text-xs text-muted-foreground">Security audit logs</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest user interactions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">AI Query</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {activity.query_text}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall system performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Active Users</span>
                  <Badge variant="outline">{analytics?.activeUsers || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Sync Jobs</span>
                  <Badge variant="outline">{analytics?.totalSyncJobs || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Admin Users</span>
                  <Badge variant="outline">{analytics?.totalAdmins || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Platform utilization overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Documents per User</span>
                    <span className="text-sm font-medium">
                      {analytics?.totalUsers ? Math.round((analytics?.totalDocuments || 0) / analytics.totalUsers) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Queries per User</span>
                    <span className="text-sm font-medium">
                      {analytics?.totalUsers ? Math.round((analytics?.totalQueries || 0) / analytics.totalUsers) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Security Events</span>
                    <span className="text-sm font-medium">{analytics?.securityEvents || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">

          {/* User Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Grant admin privileges to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">User Email</label>
                <Input
                  placeholder="Enter user email to grant admin access"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  type="email"
                />
              </div>
              
              <Button 
                onClick={grantAdminRole} 
                disabled={grantingAdmin || !newAdminEmail.trim()}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {grantingAdmin ? 'Granting Access...' : 'Grant Admin Access'}
              </Button>
            </CardContent>
          </Card>

          {/* AI Command Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                AI Command Center
              </CardTitle>
              <CardDescription>
                Send commands, requests, or notifications directly to the AI system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Enter your message to the AI command center..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={sendMessage} 
                disabled={sending || !messageText.trim()}
                className="w-full"
              >
                {sending ? 'Sending...' : 'Send to Command Center'}
              </Button>
            </CardContent>
          </Card>

          {/* Messages History */}
          <Card>
            <CardHeader>
              <CardTitle>Command Center History</CardTitle>
              <CardDescription>
                Recent messages and responses from the AI command center
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages sent yet
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(message.status)}
                          <Badge variant={getPriorityColor(message.priority)}>
                            {message.priority}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <Badge variant="outline">{message.status}</Badge>
                      </div>
                      
                      <div>
                        <p className="font-medium">Message:</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {message.message_text}
                        </p>
                      </div>

                      {message.ai_response && (
                        <div>
                          <p className="font-medium">AI Response:</p>
                          <div className="bg-muted rounded p-3 mt-1">
                            <p className="text-sm">{message.ai_response}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* App Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Application Settings
                </CardTitle>
                <CardDescription>Configure global application behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable access for all users
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="registration">User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register
                    </p>
                  </div>
                  <Switch
                    id="registration"
                    checked={settings.registrationEnabled}
                    onCheckedChange={(checked) => updateSetting('registrationEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-confirmation">Email Confirmation</Label>
                    <p className="text-sm text-muted-foreground">
                      Require email verification for new users
                    </p>
                  </div>
                  <Switch
                    id="email-confirmation"
                    checked={settings.emailConfirmationEnabled}
                    onCheckedChange={(checked) => updateSetting('emailConfirmationEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-queries">AI Queries</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI query functionality
                    </p>
                  </div>
                  <Switch
                    id="ai-queries"
                    checked={settings.aiQueriesEnabled}
                    onCheckedChange={(checked) => updateSetting('aiQueriesEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="document-sync">Document Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable document synchronization
                    </p>
                  </div>
                  <Switch
                    id="document-sync"
                    checked={settings.documentSyncEnabled}
                    onCheckedChange={(checked) => updateSetting('documentSyncEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Usage Limits
                </CardTitle>
                <CardDescription>Configure platform usage limitations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max-documents">Max Documents per User</Label>
                  <Input
                    id="max-documents"
                    type="number"
                    value={settings.maxDocumentsPerUser}
                    onChange={(e) => updateSetting('maxDocumentsPerUser', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of documents each user can upload
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-queries">Max Queries per Day</Label>
                  <Input
                    id="max-queries"
                    type="number"
                    value={settings.maxQueriesPerDay}
                    onChange={(e) => updateSetting('maxQueriesPerDay', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Daily AI query limit per user
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Perform common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={() => fetchAnalytics()}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Refresh Analytics
                </Button>
                <Button variant="outline" onClick={() => fetchMessages()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Refresh Messages
                </Button>
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Database Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}