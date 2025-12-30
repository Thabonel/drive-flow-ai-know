import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Gift,
  Copy,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CustomerInvite {
  id: string;
  invite_token: string;
  assigned_email: string | null;
  status: 'pending' | 'used' | 'expired' | 'cancelled';
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  metadata: {
    created_by_email?: string;
  };
}

export default function CustomerInvites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignedEmail, setAssignedEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all invites
  const { data: invites, isLoading } = useQuery({
    queryKey: ['customer-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerInvite[];
    },
  });

  // Generate invite mutation
  const generateInvite = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-customer-invite', {
        body: {
          assigned_email: assignedEmail || null,
          expires_in_days: expiresInDays,
          metadata: {
            source: 'admin-dashboard'
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Invite Created!',
        description: assignedEmail
          ? `Invite sent to ${assignedEmail}`
          : 'Generic invite link created',
      });

      // Copy magic link to clipboard
      if (data?.invite?.magic_link) {
        await navigator.clipboard.writeText(data.invite.magic_link);
        toast({
          title: 'Link Copied!',
          description: 'Magic link copied to clipboard',
        });
      }

      // Reset form
      setAssignedEmail('');
      setExpiresInDays(30);

      // Refresh invites list
      queryClient.invalidateQueries({ queryKey: ['customer-invites'] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate invite',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Cancel invite mutation
  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('customer_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Invite Cancelled',
        description: 'The invite has been cancelled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-invites'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invite',
        variant: 'destructive',
      });
    },
  });

  const copyMagicLink = async (token: string) => {
    const frontendUrl = window.location.origin;
    const magicLink = `${frontendUrl}/signup?invite=${token}`;

    await navigator.clipboard.writeText(magicLink);
    toast({
      title: 'Link Copied!',
      description: 'Magic link copied to clipboard',
    });
  };

  const getStatusBadge = (status: CustomerInvite['status']) => {
    const variants = {
      pending: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
      used: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      expired: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: XCircle },
      cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
    };

    const { color, icon: Icon } = variants[status];

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Customer Invites
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate and manage magic link invites for free Executive accounts
          </p>
        </div>

        {/* Generate Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Invite</CardTitle>
            <CardDescription>
              Create a magic link that grants instant Executive account access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Assigned Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={assignedEmail}
                  onChange={(e) => setAssignedEmail(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty for a generic invite link anyone can use
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  Link will expire after this many days (default: 30)
                </p>
              </div>
            </div>

            <Button
              onClick={generateInvite}
              disabled={isGenerating}
              className="w-full md:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Generate Invite Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle>All Invites</CardTitle>
            <CardDescription>
              View and manage all customer invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !invites || invites.length === 0 ? (
              <Alert>
                <Gift className="h-4 w-4" />
                <AlertDescription>
                  No invites yet. Create your first one above!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                        <TableCell>
                          {invite.assigned_email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{invite.assigned_email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Generic invite</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(invite.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invite.used_at ? (
                            <div className="text-sm text-green-600 dark:text-green-400">
                              {new Date(invite.used_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invite.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyMagicLink(invite.invite_token)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Link
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelInvite.mutate(invite.id)}
                                  disabled={cancelInvite.isPending}
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {invite.status !== 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMagicLink(invite.invite_token)}
                              >
                                <LinkIcon className="h-3 w-3 mr-1" />
                                View Link
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>How it works:</strong> Share the magic link with customers. When they sign up using the link,
            they'll instantly get a free Executive account with all premium features. No email confirmation needed!
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
