import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AddToKnowledgeBaseDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

export function AddToKnowledgeBaseDialog({
  open,
  onClose,
  documentId,
  documentTitle,
}: AddToKnowledgeBaseDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedKBId, setSelectedKBId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newKBTitle, setNewKBTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: knowledgeBases, isLoading: isLoadingKBs } = useQuery({
    queryKey: ['knowledge-bases', user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, title, type, source_document_ids')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const handleAdd = async () => {
    if (!user) return;
    setIsAdding(true);

    try {
      let targetKBId = selectedKBId;

      // Create new KB if needed
      if (isCreatingNew) {
        if (!newKBTitle.trim()) {
          toast({
            title: 'Title Required',
            description: 'Please enter a title for the new knowledge base.',
            variant: 'destructive',
          });
          setIsAdding(false);
          return;
        }

        const { data: newKB, error: createError } = await supabase
          .from('knowledge_bases')
          .insert({
            title: newKBTitle.trim(),
            user_id: user.id,
            type: 'general',
            content: {},
            source_document_ids: [],
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw new Error(createError.message);
        targetKBId = newKB.id;
      }

      if (!targetKBId) {
        toast({
          title: 'Select a Knowledge Base',
          description: 'Please select a knowledge base or create a new one.',
          variant: 'destructive',
        });
        setIsAdding(false);
        return;
      }

      // Get current source_document_ids
      const { data: kb, error: fetchError } = await supabase
        .from('knowledge_bases')
        .select('source_document_ids')
        .eq('id', targetKBId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const currentIds: string[] = kb.source_document_ids || [];

      // Check if already added
      if (currentIds.includes(documentId)) {
        toast({
          title: 'Already Added',
          description: 'This document is already in that knowledge base.',
        });
        setIsAdding(false);
        onClose();
        return;
      }

      // Add document ID to the array
      const { error: updateError } = await supabase
        .from('knowledge_bases')
        .update({
          source_document_ids: [...currentIds, documentId],
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetKBId)
        .eq('user_id', user.id);

      if (updateError) throw new Error(updateError.message);

      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user.id] });

      toast({
        title: 'Document Added',
        description: `"${documentTitle}" has been added to the knowledge base.`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add document',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedKBId('');
    setIsCreatingNew(false);
    setNewKBTitle('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add to Knowledge Base
          </DialogTitle>
          <DialogDescription>
            Add "{documentTitle}" to a knowledge base for scoped AI queries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isCreatingNew ? (
            <div className="space-y-3">
              <Label>New Knowledge Base Title</Label>
              <Input
                value={newKBTitle}
                onChange={(e) => setNewKBTitle(e.target.value)}
                placeholder="Enter knowledge base title"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNew(false)}
              >
                Use existing instead
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Select Knowledge Base</Label>
              {isLoadingKBs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <Select value={selectedKBId} onValueChange={setSelectedKBId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    {(knowledgeBases || []).map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          {kb.title}
                          <span className="text-xs text-muted-foreground">
                            ({(kb.source_document_ids || []).length} docs)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingNew(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Knowledge Base
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isAdding || (!isCreatingNew && !selectedKBId)}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                {isCreatingNew ? 'Create & Add' : 'Add to KB'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
