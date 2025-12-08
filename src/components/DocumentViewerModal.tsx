import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, Copy, Save, X, Tag, Sparkles, Lightbulb, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ExtractToTimelineDialog } from '@/components/ai/ExtractToTimelineDialog';

interface DocumentViewerModalProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal = ({ document, isOpen, onClose }: DocumentViewerModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: document?.title || '',
    content: document?.content || '',
    category: document?.category || '',
    tags: document?.tags || []
  });
  const [newTag, setNewTag] = useState('');
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDocument = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from('knowledge_documents')
        .update({
          title: data.title,
          content: data.content,
          category: data.category,
          tags: data.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)
        .eq('user_id', user!.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents', user?.id] });
      setIsEditing(false);
      toast({
        title: 'Document Updated',
        description: 'Your document has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and content.',
        variant: 'destructive',
      });
      return;
    }
    updateDocument.mutate(formData);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(formData.content);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy content.',
        variant: 'destructive',
      });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Reset form when document changes
  React.useEffect(() => {
    if (document) {
      setFormData({
        title: document.title || '',
        content: document.content || '',
        category: document.category || '',
        tags: document.tags || []
      });
      // Check if this is coming from an edit action (Google Drive documents)
      // If Google Drive document doesn't have editable content, start in view mode
      if (document.file_type === 'document' && document.content) {
        setIsEditing(false);
      } else if (document.file_type === 'manual') {
        setIsEditing(false);
      } else {
        setIsEditing(false);
      }
    }
  }, [document]);

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center flex-1 min-w-0">
              <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="truncate">{isEditing ? 'Edit Document' : 'View Document'}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopyContent}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Content
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateDocument.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateDocument.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edit your document content and details' : 'View and copy your document content'}
          </DialogDescription>
        </DialogHeader>

        {/* Add to Timeline Button - Prominent placement */}
        {!isEditing && (
          <div className="flex justify-end pb-2 border-b">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowTimelineDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add to Timeline
            </Button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            {isEditing ? (
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter document title"
                className="font-sans"
              />
            ) : (
              <div className="p-3 border rounded-md bg-muted/50 select-text font-sans text-lg font-semibold">
                {formData.title}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            {isEditing ? (
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter document content"
                rows={12}
                className="resize-none font-sans"
              />
            ) : (
              <div className="p-6 border rounded-md bg-background min-h-[300px] select-text prose prose-slate dark:prose-invert max-w-none break-words prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground">
                <ReactMarkdown>
                  {formData.content || 'No content available'}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* AI Summary Section */}
          {document.ai_summary && !isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                AI Summary
              </Label>
              <div className="p-4 border rounded-md bg-accent/5 border-accent/20">
                <p className="text-sm text-foreground">{document.ai_summary}</p>
              </div>
            </div>
          )}

          {/* AI Insights Section */}
          {document.ai_insights && !isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                AI Insights
              </Label>
              <div className="p-4 border rounded-md bg-accent/5 border-accent/20 space-y-3">
                {document.ai_insights.insights && document.ai_insights.insights.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Key Insights</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {document.ai_insights.insights.map((insight: string, index: number) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {document.ai_insights.key_concepts && document.ai_insights.key_concepts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Key Concepts</p>
                    <div className="flex flex-wrap gap-1">
                      {document.ai_insights.key_concepts.map((concept: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {document.ai_insights.content_type && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Content Type</p>
                    <Badge variant="secondary">{document.ai_insights.content_type}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              {isEditing ? (
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prompts">Prompts</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="specs">Specs</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="strategy">Strategy</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-muted/50">
                  {formData.category || 'No category'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tags..."
                      onKeyPress={handleKeyPress}
                    />
                    <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      {tag}
                      {isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeTag(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Extract to Timeline Dialog */}
      <ExtractToTimelineDialog
        open={showTimelineDialog}
        onClose={() => setShowTimelineDialog(false)}
        content={formData.content}
        sourceType="document"
        sourceTitle={formData.title}
      />
    </Dialog>
  );
};