import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Edit, Copy, Save, X, Tag, Calendar, Printer, Download, ChevronDown, FileImage, Sparkles, Loader2 } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { DocumentDiffView } from '@/components/DocumentDiffView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

  // AI Update state
  const [showAIUpdateDialog, setShowAIUpdateDialog] = useState(false);
  const [aiUpdateContext, setAIUpdateContext] = useState('');
  const [aiUpdateType, setAIUpdateType] = useState<'refresh_data' | 'add_section' | 'restructure' | 'improve_clarity' | 'custom'>('improve_clarity');
  const [isGeneratingUpdate, setIsGeneratingUpdate] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [aiUpdateResult, setAIUpdateResult] = useState<{
    original_content: string;
    suggested_content: string;
    change_summary: string;
    change_highlights: string[];
    current_version: number;
  } | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

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

  const handlePrint = () => {
    // Create a print-friendly version of the document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Please allow popups to print documents.',
        variant: 'destructive',
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formData.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .metadata {
              color: #666;
              font-size: 12px;
              margin-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${formData.title}</h1>
          <div class="metadata">
            Category: ${formData.category || 'Uncategorized'}
            ${formData.tags.length > 0 ? `| Tags: ${formData.tags.join(', ')}` : ''}
          </div>
          <div class="content">${formData.content.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    toast({
      title: 'Print Dialog Opened',
      description: 'Print preview is ready.',
    });
  };

  const handleDownload = (format: 'txt' | 'md' | 'html' | 'pdf' = 'txt') => {
    try {
      const fileName = formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      if (format === 'pdf') {
        // Use print for PDF generation
        handlePrint();
        toast({
          title: 'PDF Generation',
          description: 'Use the print dialog to save as PDF.',
        });
        return;
      }

      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      switch (format) {
        case 'txt':
          content = `${formData.title}\n${'='.repeat(formData.title.length)}\n\nCategory: ${formData.category || 'Uncategorized'}\nTags: ${formData.tags.join(', ')}\n\n${formData.content}`;
          mimeType = 'text/plain';
          extension = 'txt';
          break;

        case 'md':
          content = `# ${formData.title}\n\n`;
          content += `**Category:** ${formData.category || 'Uncategorized'}  \n`;
          content += `**Tags:** ${formData.tags.join(', ')}\n\n`;
          content += `---\n\n${formData.content}`;
          mimeType = 'text/markdown';
          extension = 'md';
          break;

        case 'html':
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${formData.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #0A2342;
      border-bottom: 3px solid #FFC300;
      padding-bottom: 10px;
    }
    .metadata {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .tag {
      display: inline-block;
      background: #FFC300;
      color: #0A2342;
      padding: 4px 12px;
      border-radius: 4px;
      margin: 2px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>${formData.title}</h1>
  <div class="metadata">
    <p><strong>Category:</strong> ${formData.category || 'Uncategorized'}</p>
    <p><strong>Tags:</strong> ${formData.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
  </div>
  <div class="content">${formData.content.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
          mimeType = 'text/html';
          extension = 'html';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Downloaded',
        description: `Document downloaded as ${extension.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document.',
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

  // AI Update handlers
  const handleGenerateAIUpdate = async () => {
    if (!aiUpdateContext.trim()) {
      toast({
        title: 'Context Required',
        description: 'Please provide context or instructions for the AI update.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingUpdate(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-document-update', {
        body: {
          document_id: document.id,
          context: aiUpdateContext,
          update_type: aiUpdateType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate update');

      setAIUpdateResult({
        original_content: data.original_content,
        suggested_content: data.suggested_content,
        change_summary: data.change_summary,
        change_highlights: data.change_highlights || [],
        current_version: data.current_version || 1,
      });
      setShowAIUpdateDialog(false);
      setShowDiffView(true);
    } catch (error) {
      console.error('AI update error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate AI update',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  const handleApproveUpdate = async (content: string) => {
    if (!aiUpdateResult || !user) return;

    setIsApplyingUpdate(true);
    try {
      const newVersion = (aiUpdateResult.current_version || 1) + 1;

      // Save version history
      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: document.id,
          version_number: newVersion,
          content: content,
          title: formData.title,
          changed_by_type: 'ai',
          changed_by_id: user.id,
          change_summary: aiUpdateResult.change_summary,
        });

      if (versionError) {
        console.error('Version save error:', versionError);
        // Non-fatal - continue with update
      }

      // Update document
      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update({
          content: content,
          current_version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setFormData(prev => ({ ...prev, content }));

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents', user.id] });

      toast({
        title: 'Document Updated',
        description: `Changes applied. Document is now at version ${newVersion}.`,
      });

      // Reset state
      setShowDiffView(false);
      setAIUpdateResult(null);
      setAIUpdateContext('');
    } catch (error) {
      console.error('Apply update error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply changes',
        variant: 'destructive',
      });
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const handleRejectUpdate = () => {
    setShowDiffView(false);
    setAIUpdateResult(null);
    toast({
      title: 'Changes Rejected',
      description: 'The suggested changes were not applied.',
    });
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
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {!isEditing && !showDiffView && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIUpdateDialog(true)}
                    className="bg-accent/10 hover:bg-accent/20 border-accent/30"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload('txt')}>
                        Plain Text (.txt)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('md')}>
                        Markdown (.md)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('html')}>
                        HTML (.html)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                        PDF (via Print)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" onClick={handleCopyContent}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
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
              <>
                {/* Show tabs if original file is available (PDF, etc.) */}
                {document.file_url && (document.file_type === 'pdf' || document.mime_type === 'application/pdf') ? (
                  <Tabs defaultValue="original" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="original" className="flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Original PDF
                      </TabsTrigger>
                      <TabsTrigger value="extracted" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Extracted Text (for AI)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="original" className="mt-4">
                      <PDFViewer
                        fileUrl={document.file_url}
                        fileName={formData.title}
                        showDownload={true}
                      />
                    </TabsContent>
                    <TabsContent value="extracted" className="mt-4">
                      <div className="p-6 border rounded-md bg-background min-h-[300px] select-text prose prose-slate dark:prose-invert max-w-none break-words prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-table:border-collapse prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-td:border prose-td:border-slate-300 prose-td:p-2">
                        {/* Render HTML content directly if it's from a Word document or contains HTML tags */}
                        {(document?.metadata?.contentFormat === 'html' ||
                          document?.metadata?.extractionMethod === 'mammoth-html' ||
                          (formData.content && /<[a-z][\s\S]*>/i.test(formData.content))) ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: formData.content || 'No content available' }}
                          />
                        ) : (
                          <ReactMarkdown>
                            {formData.content || 'No content available'}
                          </ReactMarkdown>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>
                          <strong>Note:</strong> This text includes descriptions of images and graphics (marked with [IMAGE: ...])
                          that appear in the original PDF. Use the "Original PDF" tab to see the actual visuals.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="p-6 border rounded-md bg-background min-h-[300px] select-text prose prose-slate dark:prose-invert max-w-none break-words prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-table:border-collapse prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-td:border prose-td:border-slate-300 prose-td:p-2">
                    {/* Render HTML content directly if it's from a Word document or contains HTML tags */}
                    {(document?.metadata?.contentFormat === 'html' ||
                      document?.metadata?.extractionMethod === 'mammoth-html' ||
                      (formData.content && /<[a-z][\s\S]*>/i.test(formData.content))) ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: formData.content || 'No content available' }}
                      />
                    ) : (
                      <ReactMarkdown>
                        {formData.content || 'No content available'}
                      </ReactMarkdown>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI Summary Section */}
          {document.ai_summary && !isEditing && (
            <div className="space-y-2">
              <Label>
                Summary
              </Label>
              <div className="p-4 border rounded-md bg-accent/5 border-accent/20">
                <p className="text-sm text-foreground">{document.ai_summary}</p>
              </div>
            </div>
          )}

          {/* AI Insights Section */}
          {document.ai_insights && !isEditing && (
            <div className="space-y-2">
              <Label>
                Insights
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

      {/* AI Update Context Dialog */}
      <AlertDialog open={showAIUpdateDialog} onOpenChange={setShowAIUpdateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Document Update
            </AlertDialogTitle>
            <AlertDialogDescription>
              Describe what changes you want to make to this document. The AI will generate suggestions for you to review.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-type">Update Type</Label>
              <Select value={aiUpdateType} onValueChange={(v: any) => setAIUpdateType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="improve_clarity">Improve Clarity</SelectItem>
                  <SelectItem value="refresh_data">Refresh Data</SelectItem>
                  <SelectItem value="add_section">Add Section</SelectItem>
                  <SelectItem value="restructure">Restructure</SelectItem>
                  <SelectItem value="custom">Custom Instructions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-context">Context / Instructions</Label>
              <Textarea
                id="update-context"
                value={aiUpdateContext}
                onChange={(e) => setAIUpdateContext(e.target.value)}
                placeholder={
                  aiUpdateType === 'refresh_data'
                    ? 'Paste the new data or describe what data to update...'
                    : aiUpdateType === 'add_section'
                    ? 'Describe the new section to add...'
                    : aiUpdateType === 'restructure'
                    ? 'Describe how you want the document restructured...'
                    : 'Describe the changes you want to make...'
                }
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAIUpdateDialog(false)}
              disabled={isGeneratingUpdate}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateAIUpdate} disabled={isGeneratingUpdate}>
              {isGeneratingUpdate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Update
                </>
              )}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Diff View Dialog */}
      <AlertDialog open={showDiffView} onOpenChange={setShowDiffView}>
        <AlertDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Review AI Suggestions
            </AlertDialogTitle>
            <AlertDialogDescription>
              Review the suggested changes before applying them to your document.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {aiUpdateResult && (
            <DocumentDiffView
              originalContent={aiUpdateResult.original_content}
              suggestedContent={aiUpdateResult.suggested_content}
              changeSummary={aiUpdateResult.change_summary}
              changeHighlights={aiUpdateResult.change_highlights}
              onApprove={handleApproveUpdate}
              onReject={handleRejectUpdate}
              onEdit={(content) => {
                // Allow editing before approve
              }}
              isApproving={isApplyingUpdate}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};