import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText, Calendar, Mail, Brain, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Delegation {
  id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  item_type: 'task' | 'meeting' | 'email' | 'decision' | 'research';
  item_id: string | null;
  task_title: string;
  task_description: string | null;
  instructions: string | null;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'assigned' | 'in_progress' | 'completed' | 'needs_review' | 'approved' | 'rejected';
  completion_notes: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  delegator_email?: string;
}

export function DelegationQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [completionNotes, setCompletionNotes] = useState('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Load delegations
  const loadDelegations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('delegation_queue')
        .select(`
          *,
          delegator:auth.users!delegator_user_id(email)
        `)
        .eq('delegate_user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }

      const { data, error } = await query;

      if (error) throw error;

      const delegationsWithEmail = data?.map(d => ({
        ...d,
        delegator_email: d.delegator?.email
      }));

      setDelegations(delegationsWithEmail || []);
    } catch (error) {
      console.error('Error loading delegations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delegations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDelegations();
  }, [user, filterStatus, filterPriority]);

  // Update delegation status
  const updateDelegationStatus = async (delegationId: string, newStatus: Delegation['status'], notes?: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
        if (notes) {
          updates.completion_notes = notes;
        }
      }

      const { error } = await supabase
        .from('delegation_queue')
        .update(updates)
        .eq('id', delegationId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Delegation marked as ${newStatus.replace('_', ' ')}`,
      });

      loadDelegations();
      setIsDetailDialogOpen(false);
      setCompletionNotes('');
    } catch (error) {
      console.error('Error updating delegation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update delegation status',
        variant: 'destructive',
      });
    }
  };

  // Open detail dialog
  const openDelegationDetail = (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setCompletionNotes(delegation.completion_notes || '');
    setIsDetailDialogOpen(true);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return { variant: 'secondary' as const, label: 'New' };
      case 'in_progress':
        return { variant: 'default' as const, label: 'In Progress' };
      case 'completed':
        return { variant: 'outline' as const, label: 'Completed' };
      case 'needs_review':
        return { variant: 'secondary' as const, label: 'Needs Review' };
      case 'approved':
        return { variant: 'default' as const, label: 'Approved' };
      case 'rejected':
        return { variant: 'destructive' as const, label: 'Rejected' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };

  // Get item type icon
  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2;
      case 'meeting':
        return Calendar;
      case 'email':
        return Mail;
      case 'decision':
        return AlertCircle;
      case 'research':
        return Search;
      default:
        return FileText;
    }
  };

  // Get stats
  const stats = {
    total: delegations.length,
    assigned: delegations.filter(d => d.status === 'assigned').length,
    inProgress: delegations.filter(d => d.status === 'in_progress').length,
    needsReview: delegations.filter(d => d.status === 'needs_review').length,
    urgent: delegations.filter(d => d.priority === 'urgent' && ['assigned', 'in_progress'].includes(d.status)).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delegation Queue</h2>
          <p className="text-muted-foreground">
            Tasks delegated to you by executives
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="assigned">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="needs_review">Needs Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Delegations List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Delegations</CardTitle>
          <CardDescription>
            Click on any delegation to view details and update status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delegations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No delegations found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {delegations.map((delegation) => {
                  const Icon = getItemTypeIcon(delegation.item_type);
                  const statusBadge = getStatusBadge(delegation.status);
                  const isOverdue = delegation.due_date && new Date(delegation.due_date) < new Date() && !['completed', 'approved'].includes(delegation.status);

                  return (
                    <div
                      key={delegation.id}
                      onClick={() => openDelegationDetail(delegation)}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('h-2 w-2 rounded-full mt-2', getPriorityColor(delegation.priority))} />
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{delegation.task_title}</h4>
                            <Badge {...statusBadge}>{statusBadge.label}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {delegation.item_type}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          {delegation.task_description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {delegation.task_description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>From: {delegation.delegator_email?.split('@')[0]}</span>
                            {delegation.due_date && (
                              <span className={isOverdue ? 'text-red-500' : ''}>
                                Due: {new Date(delegation.due_date).toLocaleDateString()}
                              </span>
                            )}
                            <span>Created: {new Date(delegation.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDelegation?.task_title}</DialogTitle>
            <DialogDescription>
              Delegated by {selectedDelegation?.delegator_email}
            </DialogDescription>
          </DialogHeader>

          {selectedDelegation && (
            <div className="space-y-4">
              {/* Status and Priority */}
              <div className="flex gap-2">
                <Badge {...getStatusBadge(selectedDelegation.status)}>
                  {getStatusBadge(selectedDelegation.status).label}
                </Badge>
                <Badge variant="outline">{selectedDelegation.item_type}</Badge>
                <Badge
                  className={cn(
                    'text-white',
                    selectedDelegation.priority === 'urgent' && 'bg-red-500',
                    selectedDelegation.priority === 'high' && 'bg-orange-500',
                    selectedDelegation.priority === 'normal' && 'bg-blue-500',
                    selectedDelegation.priority === 'low' && 'bg-gray-500'
                  )}
                >
                  {selectedDelegation.priority.toUpperCase()}
                </Badge>
              </div>

              {/* Description */}
              {selectedDelegation.task_description && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedDelegation.task_description}</p>
                </div>
              )}

              {/* Instructions */}
              {selectedDelegation.instructions && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedDelegation.instructions}</p>
                </div>
              )}

              {/* Due Date */}
              {selectedDelegation.due_date && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Due Date</h4>
                  <p className="text-sm">
                    {new Date(selectedDelegation.due_date).toLocaleString()}
                    {new Date(selectedDelegation.due_date) < new Date() && (
                      <span className="text-red-500 ml-2">(Overdue)</span>
                    )}
                  </p>
                </div>
              )}

              {/* Completion Notes */}
              {selectedDelegation.status === 'in_progress' || selectedDelegation.status === 'assigned' ? (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Completion Notes (Optional)</h4>
                  <Textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add notes about how you completed this task..."
                    rows={4}
                  />
                </div>
              ) : selectedDelegation.completion_notes ? (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Completion Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedDelegation.completion_notes}
                  </p>
                </div>
              ) : null}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">Created</h4>
                  <p>{new Date(selectedDelegation.created_at).toLocaleString()}</p>
                </div>
                {selectedDelegation.completed_at && (
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground mb-1">Completed</h4>
                    <p>{new Date(selectedDelegation.completed_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedDelegation.reviewed_at && (
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground mb-1">Reviewed</h4>
                    <p>{new Date(selectedDelegation.reviewed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedDelegation?.status === 'assigned' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => updateDelegationStatus(selectedDelegation.id, 'in_progress')}
                >
                  Start Working
                </Button>
                <Button
                  onClick={() => updateDelegationStatus(selectedDelegation.id, 'completed', completionNotes)}
                >
                  Mark Complete
                </Button>
              </>
            )}
            {selectedDelegation?.status === 'in_progress' && (
              <Button
                onClick={() => updateDelegationStatus(selectedDelegation.id, 'completed', completionNotes)}
              >
                Mark Complete
              </Button>
            )}
            {selectedDelegation?.status === 'completed' && (
              <Button variant="outline" disabled>
                Completed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
