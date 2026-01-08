import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Brain, User, Heart, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Memory {
  id: string;
  memory_type: string;
  content: string;
  created_at: string;
  metadata?: {
    importance?: string;
    source?: string;
    conversation_id?: string;
  };
}

interface MemoryManagerProps {
  userId: string;
}

const memoryTypeConfig: Record<string, { label: string; icon: typeof User; variant: 'default' | 'secondary' | 'outline' }> = {
  user_fact: { label: 'About You', icon: User, variant: 'default' },
  preference: { label: 'Preference', icon: Heart, variant: 'secondary' },
  context_note: { label: 'Context', icon: FileText, variant: 'outline' },
  conversation_summary: { label: 'Summary', icon: Brain, variant: 'outline' },
};

export function MemoryManager({ userId }: MemoryManagerProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMemories();
  }, [userId]);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('agentic_memories')
        .select('id, memory_type, content, created_at, metadata')
        .eq('user_id', userId)
        .in('memory_type', ['user_fact', 'preference', 'context_note', 'conversation_summary'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI memories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('agentic_memories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setMemories(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      toast({
        title: 'Memory Deleted',
        description: 'The AI will no longer remember this fact.',
      });
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete memory',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('agentic_memories')
        .delete()
        .in('id', Array.from(selectedIds))
        .eq('user_id', userId);

      if (error) throw error;

      setMemories(prev => prev.filter(m => !selectedIds.has(m.id)));
      setSelectedIds(new Set());

      toast({
        title: 'Memories Deleted',
        description: `Deleted ${selectedIds.size} memories. The AI will no longer remember these facts.`,
      });
    } catch (error) {
      console.error('Failed to delete memories:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete selected memories',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === memories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(memories.map(m => m.id)));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading AI memories...</span>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <div>
          <p className="font-medium">No memories yet</p>
          <p className="text-sm text-muted-foreground">
            The AI will remember facts about you from archived conversations.
            Start a conversation and archive it to see memories appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          These memories help the AI remember you across conversations.
          Facts are automatically extracted when you archive conversations.
          Delete any memories you want the AI to forget.
        </AlertDescription>
      </Alert>

      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectedIds.size === memories.length && memories.length > 0}
            onCheckedChange={selectAll}
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            {selectedIds.size === memories.length ? 'Deselect all' : 'Select all'}
          </label>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              ({selectedIds.size} selected)
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                {bulkDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} memories?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove these memories. The AI will no longer
                  remember these facts about you in future conversations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSelected}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Memory list */}
      <div className="space-y-2">
        {memories.map(memory => {
          const config = memoryTypeConfig[memory.memory_type] || memoryTypeConfig.context_note;
          const Icon = config.icon;

          return (
            <div
              key={memory.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                selectedIds.has(memory.id) ? 'bg-accent/50 border-primary/30' : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selectedIds.has(memory.id)}
                onCheckedChange={() => toggleSelection(memory.id)}
                className="mt-1"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={config.variant} className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(memory.created_at)}
                  </span>
                  {memory.metadata?.importance === 'high' && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      Important
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{memory.content}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMemory(memory.id)}
                disabled={deleting === memory.id}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                {deleting === memory.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
      </p>
    </div>
  );
}
