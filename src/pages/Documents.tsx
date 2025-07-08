import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Search, Archive, Tag, Calendar, Brain, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';

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
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleViewDocument = (doc: any) => {
    // Open document in a modal or navigate to detailed view
    window.open(`https://drive.google.com/file/d/${doc.google_file_id}/view`, '_blank');
  };

  const handleGenerateInsights = (docId: string) => {
    generateInsights.mutate(docId);
  };

  const categories = ['prompts', 'marketing', 'specs', 'general'];

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

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Connect your Google Drive folders to start seeing documents here'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(doc.category)}`} />
                </div>
                <CardDescription className="line-clamp-3">
                  {doc.ai_summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  {doc.drive_modified_at ? new Date(doc.drive_modified_at).toLocaleDateString() : 'Unknown date'}
                </div>
                
                 <div className="flex flex-wrap gap-1">
                   {(doc.tags || []).map((tag, index) => (
                     <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                       <Tag className="h-3 w-3 mr-1" />
                       {tag}
                     </Badge>
                   ))}
                 </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateInsights(doc.id)}
                    disabled={generateInsights.isPending}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {generateInsights.isPending ? 'Generating...' : 'AI Insights'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Documents;