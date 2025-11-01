import { useState, useEffect } from 'react';
import { UserPlus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DelegateTaskButtonProps {
  timelineItemId?: string;
  timelineItemTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

interface Assistant {
  assistant_id: string;
  assistant_email: string;
  permissions: any;
}

interface DelegationFormData {
  assistant_id: string;
  item_type: 'task' | 'meeting' | 'email' | 'decision' | 'research';
  task_title: string;
  task_description: string;
  instructions: string;
  due_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export function DelegateTaskButton({
  timelineItemId,
  timelineItemTitle,
  variant = 'outline',
  size = 'default',
  className,
}: DelegateTaskButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DelegationFormData>({
    assistant_id: '',
    item_type: timelineItemId ? 'meeting' : 'task',
    task_title: timelineItemTitle || '',
    task_description: '',
    instructions: '',
    due_date: '',
    priority: 'normal',
  });

  // Load executive's assistants
  const loadAssistants = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_relationships')
        .select('assistant_id, assistant_email, permissions')
        .eq('executive_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      setAssistants(data || []);

      // Auto-select if only one assistant
      if (data && data.length === 1) {
        setFormData(prev => ({ ...prev, assistant_id: data[0].assistant_id }));
      }
    } catch (error) {
      console.error('Error loading assistants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your assistants',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssistants();
    }
  }, [isOpen, user]);

  // Handle form submission
  const handleDelegate = async () => {
    if (!user) return;

    // Validation
    if (!formData.assistant_id) {
      toast({
        title: 'Select Assistant',
        description: 'Please select an assistant to delegate to',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.task_title.trim()) {
      toast({
        title: 'Task Title Required',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('delegation_queue').insert({
        delegator_user_id: user.id,
        delegate_user_id: formData.assistant_id,
        item_type: formData.item_type,
        item_id: timelineItemId || null,
        task_title: formData.task_title,
        task_description: formData.task_description || null,
        instructions: formData.instructions || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        status: 'assigned',
      });

      if (error) throw error;

      toast({
        title: 'Task Delegated',
        description: `Successfully delegated to ${assistants.find(a => a.assistant_id === formData.assistant_id)?.assistant_email}`,
      });

      // Reset form and close dialog
      setFormData({
        assistant_id: assistants.length === 1 ? assistants[0].assistant_id : '',
        item_type: timelineItemId ? 'meeting' : 'task',
        task_title: timelineItemTitle || '',
        task_description: '',
        instructions: '',
        due_date: '',
        priority: 'normal',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error delegating task:', error);
      toast({
        title: 'Delegation Failed',
        description: 'Failed to delegate task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set default due date (tomorrow)
  const getDefaultDueDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0); // 5 PM tomorrow
    return tomorrow.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <UserPlus className="h-4 w-4 mr-2" />
          Delegate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delegate Task to Assistant</DialogTitle>
          <DialogDescription>
            Assign this task to one of your assistants for handling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assistant Selection */}
          <div className="space-y-2">
            <Label htmlFor="assistant">Select Assistant *</Label>
            {assistants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You don't have any active assistants. Please add an assistant first.
              </p>
            ) : (
              <Select
                value={formData.assistant_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assistant_id: value }))}
              >
                <SelectTrigger id="assistant">
                  <SelectValue placeholder="Choose an assistant" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.assistant_id} value={assistant.assistant_id}>
                      {assistant.assistant_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Task Type *</Label>
            <Select
              value={formData.item_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, item_type: value }))}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">General Task</SelectItem>
                <SelectItem value="meeting">Meeting-Related</SelectItem>
                <SelectItem value="email">Email/Communication</SelectItem>
                <SelectItem value="decision">Decision Support</SelectItem>
                <SelectItem value="research">Research</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.task_title}
              onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
              placeholder="e.g., Prepare briefing for board meeting"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.task_description}
              onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
              placeholder="What needs to be done?"
              rows={3}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Any specific guidance or requirements..."
              rows={3}
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger id="priority">
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

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData(prev => ({ ...prev, due_date: getDefaultDueDate() }))}
            >
              Due Tomorrow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                nextWeek.setHours(17, 0, 0, 0);
                setFormData(prev => ({ ...prev, due_date: nextWeek.toISOString().slice(0, 16) }));
              }}
            >
              Due Next Week
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelegate} disabled={isLoading || assistants.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Delegating...' : 'Delegate Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
