import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, Ticket, Clock, CheckCircle2, MessageSquare } from 'lucide-react';

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
  open: 'default',
  in_progress: 'secondary',
  waiting_response: 'outline',
  resolved: 'default',
  closed: 'secondary'
} as const;

export default function Support() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  // Fetch user's support tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Submit ticket mutation
  const submitTicket = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Auto-assign priority based on category
      let priority = 'normal';
      if (category === 'billing' || category === 'bug_report') {
        priority = 'high';
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Support ticket submitted successfully!');
      setSubject('');
      setMessage('');
      setCategory('');
      queryClient.invalidateQueries({ queryKey: ['support-tickets', user?.id] });
    },
    onError: (error: any) => {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit ticket. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim() || !category) {
      toast.error('Please fill out all fields');
      return;
    }

    if (message.length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    submitTicket.mutate();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground">
          Submit a support ticket and our team will get back to you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Ticket Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit a Ticket
            </CardTitle>
            <CardDescription>
              Describe your issue and we'll help you resolve it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Provide details about your issue..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {message.length} characters (minimum 10)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitTicket.isPending || !category || !subject.trim() || message.length < 10}
              >
                {submitTicket.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              My Tickets
            </CardTitle>
            <CardDescription>
              View the status of your support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {ticket.subject}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[ticket.category as keyof typeof categoryLabels]}
                        </p>
                      </div>
                      <Badge variant={statusColors[ticket.status as keyof typeof statusColors]}>
                        {statusLabels[ticket.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.message}
                    </p>

                    {ticket.admin_response && (
                      <div className="bg-primary/5 border border-primary/20 rounded p-3 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-primary">Admin Response</span>
                        </div>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      {ticket.status === 'resolved' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No support tickets yet</p>
                <p className="text-sm">Submit a ticket to get help from our team</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
