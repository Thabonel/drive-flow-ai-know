import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DocumentGrid } from '@/components/DocumentGrid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, BookOpen, FileText, Check } from 'lucide-react';

interface BulkDocumentManagerProps {
  knowledgeBase: {
    id: string;
    title: string;
    source_document_ids: string[];
  };
  onClose: () => void;
}

export const BulkDocumentManager = ({ knowledgeBase, onClose }: BulkDocumentManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [mode, setMode] = useState<'add' | 'remove'>('add');

  // Fetch all user documents
  const { data: allDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['all-documents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });

  // Fetch current KB documents
  const { data: kbDocuments } = useQuery({
    queryKey: ['kb-documents', knowledgeBase.id],
    enabled: !!knowledgeBase.source_document_ids?.length,
    queryFn: async () => {
      if (!knowledgeBase.source_document_ids?.length) return [];
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .in('id', knowledgeBase.source_document_ids);
      if (error) throw new Error(error.message);
      return data;
    }
  });

  // Get documents based on current mode
  const availableDocuments = mode === 'add'
    ? allDocuments?.filter(doc => !knowledgeBase.source_document_ids?.includes(doc.id)) || []
    : kbDocuments || [];

  // Bulk update KB documents
  const updateKBMutation = useMutation({
    mutationFn: async ({ action, documentIds }: { action: 'add' | 'remove', documentIds: string[] }) => {
      let updatedDocumentIds: string[];

      if (action === 'add') {
        updatedDocumentIds = [...(knowledgeBase.source_document_ids || []), ...documentIds];
      } else {
        updatedDocumentIds = (knowledgeBase.source_document_ids || []).filter(id => !documentIds.includes(id));
      }

      const { error } = await supabase
        .from('knowledge_bases')
        .update({
          source_document_ids: updatedDocumentIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', knowledgeBase.id)
        .eq('user_id', user!.id);

      if (error) throw new Error(error.message);
      return updatedDocumentIds;
    },
    onSuccess: (updatedIds, { action, documentIds }) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      queryClient.invalidateQueries({ queryKey: ['kb-documents'] });

      toast({
        title: 'Success',
        description: `${action === 'add' ? 'Added' : 'Removed'} ${documentIds.length} document${documentIds.length > 1 ? 's' : ''} ${action === 'add' ? 'to' : 'from'} knowledge base`,
      });

      setSelectedDocuments([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === availableDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(availableDocuments.map(doc => doc.id));
    }
  };

  const handleBulkAction = () => {
    if (selectedDocuments.length === 0) return;
    updateKBMutation.mutate({ action: mode, documentIds: selectedDocuments });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      prompts: 'bg-purple-100 text-purple-800',
      marketing: 'bg-green-100 text-green-800',
      specs: 'bg-blue-100 text-blue-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Manage Documents - {knowledgeBase.title}
          </DialogTitle>
          <DialogDescription>
            Add or remove documents from this knowledge base in bulk
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 overflow-hidden">
          {/* Mode Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={mode} onValueChange={(value: 'add' | 'remove') => setMode(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Documents
                    </div>
                  </SelectItem>
                  <SelectItem value="remove">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4" />
                      Remove Documents
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline">
                {mode === 'add'
                  ? `${availableDocuments.length} available`
                  : `${availableDocuments.length} in KB`
                }
              </Badge>
            </div>

            {/* Selection Controls */}
            {availableDocuments.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedDocuments.length === availableDocuments.length ? 'Deselect All' : 'Select All'}
                </Button>

                {selectedDocuments.length > 0 && (
                  <Button
                    onClick={handleBulkAction}
                    disabled={updateKBMutation.isPending}
                    className="gap-2"
                  >
                    {mode === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    {mode === 'add' ? 'Add' : 'Remove'} {selectedDocuments.length} Document{selectedDocuments.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Document Grid with Selection */}
          <div className="flex-1 overflow-auto">
            {availableDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">
                  {mode === 'add' ? 'No documents available to add' : 'No documents in this knowledge base'}
                </h3>
                <p className="text-muted-foreground">
                  {mode === 'add'
                    ? 'All your documents are already in this knowledge base'
                    : 'Add some documents to get started'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableDocuments.map((doc) => (
                  <Card
                    key={doc.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedDocuments.includes(doc.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleDocumentToggle(doc.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">
                            {doc.title}
                          </CardTitle>
                        </div>
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          className="ml-2 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {doc.ai_summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {doc.ai_summary}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <Badge className={getCategoryColor(doc.category || 'general')}>
                            {doc.category || 'general'}
                          </Badge>
                          <span className="text-muted-foreground">
                            {doc.file_type}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};