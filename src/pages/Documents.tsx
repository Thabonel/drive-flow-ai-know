import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';
import { DocumentSearchFilter } from '@/components/DocumentSearchFilter';
import { DocumentGrid } from '@/components/DocumentGrid';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PaginationControls } from '@/components/PaginationControls';

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('created_desc');
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 12;

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading, error, isError } = useQuery({
    queryKey: ['documents', user?.id, sortBy],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id);

      // Apply sorting based on sortBy value
      switch (sortBy) {
        case 'created_desc':
          query = query.order('created_at', { ascending: false });
          break;
        case 'created_asc':
          query = query.order('created_at', { ascending: true });
          break;
        case 'modified_desc':
          query = query.order('drive_modified_at', { ascending: false, nullsFirst: false });
          break;
        case 'modified_asc':
          query = query.order('drive_modified_at', { ascending: true, nullsFirst: false });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const generateInsights = useMutation({
    mutationFn: async (docId: string) => {
      // Get the document to analyze
      const { data: doc, error: docError } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('id', docId)
        .eq('user_id', user!.id)
        .single();
      
      if (docError) throw new Error(docError.message);
      
      // Call AI document analysis edge function
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('ai-document-analysis', {
        body: {
          document_id: docId,
          user_id: user!.id,
          content: doc.content || '',
          title: doc.title
        }
      });
      
      if (analysisError) throw new Error(analysisError.message);
      
      // Update document with AI insights
      const { data, error } = await supabase
        .from('knowledge_documents')
        .update({ 
          ai_insights: analysisResult.insights,
          ai_summary: analysisResult.summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId)
        .eq('user_id', user!.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast({
        title: 'AI Insights Generated',
        description: 'New insights have been generated for this document.',
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

  const handleViewDocument = (doc: any) => {
    // All documents are now accessed from Supabase database
    // Open in the viewer modal regardless of origin
    setViewerDocument(doc);
    setIsViewerOpen(true);
  };

  const handleEditDocument = (doc: any) => {
    // All documents are now edited through the Supabase interface
    // Open in the viewer modal in edit mode
    setViewerDocument(doc);
    setIsViewerOpen(true);
  };

  const handleGenerateInsights = (docId: string) => {
    generateInsights.mutate(docId);
  };

  const handleDeleteDocument = (doc: any) => {
    setDocumentToDelete(doc);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete || !user) return;

    try {
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', documentToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
      toast({
        title: 'Document Deleted',
        description: 'The document has been successfully deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const categories = ['prompts', 'marketing', 'specs', 'general', 'research', 'planning', 'strategy', 'notes', 'reference'];

  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory && !doc.is_archived;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + documentsPerPage);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

  const getCategoryColor = (category: string) => {
    const colors = {
      prompts: 'bg-primary',
      marketing: 'bg-accent',
      specs: 'bg-secondary',
      general: 'bg-muted',
    };
    return colors[category as keyof typeof colors] || 'bg-muted';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Find Documents</h1>
          <p className="text-muted-foreground">Browse and search your knowledge documents</p>
        </div>
        <CreateKnowledgeDocumentModal 
          trigger={
            <Button size="lg" data-create-document aria-label="Create new document">
              <Plus className="h-5 w-5 mr-2" />
              Create Document
            </Button>
          }
        />
      </div>

      <DocumentSearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {isError && (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load documents</div>
          <div className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DocumentGrid
          documents={paginatedDocuments}
          isLoading={isLoading}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onViewDocument={handleViewDocument}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
          onGenerateInsights={handleGenerateInsights}
          isGeneratingInsights={generateInsights.isPending}
          getCategoryColor={getCategoryColor}
        />
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredDocuments.length}
        itemsPerPage={documentsPerPage}
      />

      <DocumentViewerModal 
        document={viewerDocument}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerDocument(null);
        }}
      />

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        description={`Are you sure you want to delete "${documentToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default Documents;