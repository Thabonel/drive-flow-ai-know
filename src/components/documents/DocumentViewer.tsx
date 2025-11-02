import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Trash2,
  Upload,
  Eye,
  Star,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from './DocumentUploader';
import { formatDistanceToNow } from 'date-fns';

interface TimelineItemDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  is_briefing_package: boolean;
  uploaded_by_user_id: string;
  uploaded_via_assistant: boolean;
  uploaded_at: string;
  storage_path: string;
}

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  timelineItemId: string;
  timelineItemTitle?: string;
  assistantRelationshipId?: string | null;
}

export function DocumentViewer({
  open,
  onClose,
  timelineItemId,
  timelineItemTitle,
  assistantRelationshipId = null,
}: DocumentViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<TimelineItemDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TimelineItemDocument | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timeline_item_documents')
        .select('*')
        .eq('timeline_item_id', timelineItemId)
        .order('is_briefing_package', { ascending: false })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Failed to load documents',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, timelineItemId]);

  const handleDownload = async (doc: TimelineItemDocument) => {
    try {
      // Download file via signed URL
      const { data, error } = await supabase.storage
        .from('timeline-documents')
        .createSignedUrl(doc.storage_path, 60); // 60 seconds

      if (error) throw error;

      // Open in new tab to trigger download
      window.open(data.signedUrl, '_blank');

      toast({
        title: 'Download started',
        description: doc.file_name,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (doc: TimelineItemDocument) => {
    if (!confirm(`Delete ${doc.file_name}?`)) return;

    setDeleting(doc.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('timeline-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('timeline_item_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Log activity if deleted by assistant
      if (assistantRelationshipId) {
        await supabase.rpc('log_assistant_activity', {
          p_relationship_id: assistantRelationshipId,
          p_action_type: 'deleted_item',
          p_description: `Deleted document: ${doc.file_name}`,
          p_target_type: 'document',
          p_target_id: doc.id,
        });
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

      toast({
        title: 'Document deleted',
        description: doc.file_name,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Failed to delete document',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
            {documents.length > 0 && (
              <Badge variant="secondary">{documents.length}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {timelineItemTitle || 'Attached documents for this timeline item'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="documents" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents" className="gap-2">
              <Eye className="h-4 w-4" />
              View Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No documents attached</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload documents using the "Upload New" tab
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`
                      flex items-start gap-4 p-4 border rounded-lg transition-colors
                      ${doc.is_briefing_package ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20' : 'bg-card'}
                      hover:bg-accent/50
                    `}
                  >
                    {/* File icon */}
                    <div className="flex-shrink-0">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>

                    {/* File details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm break-all">
                            {doc.file_name}
                          </p>
                          {doc.is_briefing_package && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3" />
                              Briefing
                            </Badge>
                          )}
                          {doc.uploaded_via_assistant && (
                            <Badge variant="outline" className="text-xs">
                              By Assistant
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {formatFileSize(doc.file_size)} •{' '}
                        {formatDistanceToNow(new Date(doc.uploaded_at), {
                          addSuffix: true,
                        })}
                      </p>

                      {doc.description && (
                        <p className="text-xs text-muted-foreground italic mb-2">
                          {doc.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>

                        {doc.mime_type === 'application/pdf' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDocument(doc)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleting === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-4">
            <DocumentUploader
              timelineItemId={timelineItemId}
              onUploadComplete={fetchDocuments}
              assistantRelationshipId={assistantRelationshipId}
            />
          </TabsContent>
        </Tabs>

        {/* PDF Preview Modal */}
        {selectedDocument && selectedDocument.mime_type === 'application/pdf' && (
          <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
            <DialogContent className="sm:max-w-6xl h-[90vh]">
              <DialogHeader>
                <DialogTitle>{selectedDocument.file_name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={selectedDocument.file_url}
                  className="w-full h-full border rounded"
                  title={selectedDocument.file_name}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
