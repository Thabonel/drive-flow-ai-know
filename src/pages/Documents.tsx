import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';
import { DocumentSearchFilter } from '@/components/DocumentSearchFilter';
import { DocumentGrid } from '@/components/DocumentGrid';

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id)
        .order('drive_modified_at', { ascending: false });
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
    // Check if this is a document created in the app (manual document)
    if (doc.file_type === 'manual' || doc.google_file_id?.startsWith('manual-')) {
      // For app-created documents, show content in a modal or alert
      alert(`Title: ${doc.title}\n\nContent:\n${doc.content || 'No content available'}`);
      return;
    }
    // For Google Drive documents, open in Google Drive
    window.open(`https://drive.google.com/file/d/${doc.google_file_id}/view`, '_blank');
  };

  const handleEditDocument = (doc: any) => {
    // Open document for editing in Google Drive
    window.open(`https://docs.google.com/document/d/${doc.google_file_id}/edit`, '_blank');
  };

  const handleGenerateInsights = (docId: string) => {
    generateInsights.mutate(docId);
  };

  const categories = ['prompts', 'marketing', 'specs', 'general', 'research', 'planning', 'strategy', 'notes', 'reference'];

  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory && !doc.is_archived;
  });

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
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Browse and search your knowledge documents</p>
        </div>
        <CreateKnowledgeDocumentModal 
          trigger={
            <Button size="lg">
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
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DocumentGrid
          documents={filteredDocuments}
          isLoading={isLoading}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onViewDocument={handleViewDocument}
          onEditDocument={handleEditDocument}
          onGenerateInsights={handleGenerateInsights}
          isGeneratingInsights={generateInsights.isPending}
          getCategoryColor={getCategoryColor}
        />
      </div>
    </div>
  );
};

export default Documents;