import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Clock, Pin, Eye } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const RecentDocuments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const { data: recentDocs, isLoading } = useQuery({
    queryKey: ['recent-documents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const handleViewDocument = (doc: any) => {
    setViewingDoc(doc);
  };

  const handlePinDocument = async (docId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ is_pinned: isPinned })
        .eq('id', docId)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: isPinned ? 'Document pinned' : 'Document unpinned',
        description: isPinned ? 'Document added to pinned items' : 'Document removed from pinned items',
      });

      queryClient.invalidateQueries({ queryKey: ['recent-documents', user?.id] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update document',
        variant: 'destructive',
      });
    }
  };

  const getFileTypeColor = (fileType: string) => {
    const colors = {
      'pdf': 'bg-red-100 text-red-700 border-red-200',
      'doc': 'bg-blue-100 text-blue-700 border-blue-200',
      'docx': 'bg-blue-100 text-blue-700 border-blue-200',
      'txt': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[fileType as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Recent Documents
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
            View All
          </Button>
        </div>
        <CardDescription>Your recently updated documents</CardDescription>
      </CardHeader>
      <CardContent>
        {!recentDocs || recentDocs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="mb-2">No documents yet</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/drive')}>
              Connect Google Drive
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                    <Badge variant="outline" className={getFileTypeColor(doc.file_type)}>
                      {doc.file_type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </div>
                    {doc.category && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.category}
                      </Badge>
                    )}
                  </div>
                  {doc.ai_summary && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {truncateText(doc.ai_summary, 80)}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleViewDocument(doc)}
                    title="View document"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handlePinDocument(doc.id, !doc.is_pinned)}
                    title={doc.is_pinned ? "Unpin document" : "Pin document"}
                  >
                    <Pin className={`h-3 w-3 ${doc.is_pinned ? 'fill-current text-primary' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Document View Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{viewingDoc?.title}</span>
              <Badge variant="outline" className={getFileTypeColor(viewingDoc?.file_type)}>
                {viewingDoc?.file_type.toUpperCase()}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingDoc?.ai_summary && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">AI Summary</h4>
                <p className="text-sm">{viewingDoc.ai_summary}</p>
              </div>
            )}
            {viewingDoc?.content ? (
              <div className="prose prose-sm max-w-none">
                <h4 className="font-medium mb-2">Content</h4>
                <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-lg">
                  {viewingDoc.content}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No content available for this document.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};