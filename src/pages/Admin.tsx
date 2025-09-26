import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Send, MessageSquare, Clock, CheckCircle, Users, UserPlus } from 'lucide-react';

interface AdminMessage {
  id: string;
  message_text: string;
  ai_response: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processed' | 'responded';
  created_at: string;
  updated_at: string;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [grantingAdmin, setGrantingAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchMessages();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">AI Command Center Communication</p>
      </div>

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

      {/* Send Message Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Message to AI Command Center
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
          <CardTitle>Command Center Communication History</CardTitle>
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
            <div className="space-y-4">
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
    </div>
  );
}