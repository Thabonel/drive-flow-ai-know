import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Ticket, User, Clock, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categoryLabels = {
  technical: 'Technical Issue',
  billing: 'Billing & Payments',
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  general: 'General Question'
};

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_response: 'Waiting for Response',
  resolved: 'Resolved',
  closed: 'Closed'
};

const statusColors = {
  open: 'destructive',
  in_progress: 'default',
  waiting_response: 'secondary',
  resolved: 'outline',
  closed: 'secondary'
} as const;

const priorityColors = {
  low: 'secondary',
  normal: 'default',
  high: 'default',
  urgent: 'destructive'
} as const;

export default function AdminSupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [activeTab, setActiveTab] = useState('open');

  // Fetch all support tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Update ticket mutation
  const updateTicket = useMutation({
    mutationFn: async ({ ticketId, status, response }: { ticketId: string; status?: string; response?: string }) => {
      const updates: any = {};

      if (status) {
        updates.status = status;
      }

      if (response) {
        updates.admin_response = response;
        updates.admin_id = user?.id;
        updates.responded_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Ticket updated successfully!');
      setSelectedTicket(null);
      setAdminResponse('');
      setNewStatus('');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
    onError: (error: any) => {
      console.error('Error updating ticket:', error);
      toast.error(error.message || 'Failed to update ticket');
    },
  });

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;

    if (!adminResponse.trim() && !newStatus) {
      toast.error('Please provide a response or update the status');
      return;
    }

    updateTicket.mutate({
      ticketId: selectedTicket.id,
      status: newStatus || undefined,
      response: adminResponse.trim() || undefined,
    });
  };

  const filterTickets = (status: string) => {
    if (!tickets) return [];

    switch (status) {
      case 'open':
        return tickets.filter(t => t.status === 'open');
      case 'in_progress':
        return tickets.filter(t => t.status === 'in_progress');
      case 'resolved':
        return tickets.filter(t => ['resolved', 'closed'].includes(t.status));
      default:
        return tickets;
    }
  };

  const openTickets = filterTickets('open');
  const inProgressTickets = filterTickets('in_progress');
  const resolvedTickets = filterTickets('resolved');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-muted-foreground">
          Manage and respond to user support requests
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="open" className="relative">
            Open
            {openTickets.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {openTickets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="relative">
            In Progress
            {inProgressTickets.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {inProgressTickets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="open" className="mt-6">
              <TicketList tickets={openTickets} onSelectTicket={(ticket) => {
                setSelectedTicket(ticket);
                setAdminResponse('');
                setNewStatus(ticket.status);
              }} />
            </TabsContent>

            <TabsContent value="in_progress" className="mt-6">
              <TicketList tickets={inProgressTickets} onSelectTicket={(ticket) => {
                setSelectedTicket(ticket);
                setAdminResponse('');
                setNewStatus(ticket.status);
              }} />
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              <TicketList tickets={resolvedTickets} onSelectTicket={(ticket) => {
                setSelectedTicket(ticket);
                setAdminResponse('');
                setNewStatus(ticket.status);
              }} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{selectedTicket?.subject}</span>
              <Badge variant={statusColors[selectedTicket?.status as keyof typeof statusColors]}>
                {selectedTicket && statusLabels[selectedTicket.status as keyof typeof statusLabels]}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Ticket ID: {selectedTicket?.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedTicket.user?.email || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {categoryLabels[selectedTicket.category as keyof typeof categoryLabels]}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge variant={priorityColors[selectedTicket.priority as keyof typeof priorityColors]}>
                    {selectedTicket.priority.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* User Message */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">User Message:</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Existing Admin Response */}
              {selectedTicket.admin_response && (
                <div className="border border-primary rounded-lg p-4 bg-primary/5">
                  <p className="text-sm font-medium mb-2 text-primary flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Previous Admin Response:
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                  {selectedTicket.responded_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Responded: {new Date(selectedTicket.responded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Admin Response Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_response">Waiting for Response</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="response">Admin Response</Label>
                  <Textarea
                    id="response"
                    placeholder="Type your response to the user..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTicket(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTicket}
              disabled={updateTicket.isPending || (!adminResponse.trim() && !newStatus)}
            >
              {updateTicket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Ticket'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketList({ tickets, onSelectTicket }: { tickets: any[]; onSelectTicket: (ticket: any) => void }) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tickets in this category</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectTicket(ticket)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base truncate">{ticket.subject}</CardTitle>
              <Badge variant={priorityColors[ticket.priority as keyof typeof priorityColors]} className="text-xs">
                {ticket.priority}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {categoryLabels[ticket.category as keyof typeof categoryLabels]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.message}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {ticket.user?.email?.split('@')[0] || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(ticket.created_at).toLocaleDateString()}
              </span>
            </div>

            {ticket.admin_response && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <CheckCircle2 className="h-3 w-3" />
                <span>Response sent</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
