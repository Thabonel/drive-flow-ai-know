import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Plus, BookOpen, Lightbulb, BarChart3, Search,
  PanelLeftClose, PanelLeftOpen, Edit2, Trash2, Loader2, Sparkles,
  Check, X, ArrowUpDown,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DocumentGrid } from '@/components/DocumentGrid';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ConversationChat } from '@/components/ConversationChat';

const KnowledgeBases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sidebar state
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('kb-sidebar-collapsed');
    return saved === 'true';
  });

  // Create KB state
  const [isCreating, setIsCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createType, setCreateType] = useState('general');

  // Edit KB state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('general');

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Document viewer state
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);

  // Document filters
  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docSelectedCategory, setDocSelectedCategory] = useState<string | null>(null);
  const [docSortBy, setDocSortBy] = useState('created_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);
  const documentsPerPage = 12;

  // AI suggestion state
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedDocs, setSuggestedDocs] = useState<any[]>([]);

  // Fetch knowledge bases
  const { data: knowledgeBases, isLoading: isLoadingKBs } = useQuery({
    queryKey: ['knowledge-bases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const selectedKB = knowledgeBases?.find((kb) => kb.id === selectedKBId) || null;

  // Fetch documents for the selected KB
  const { data: kbDocuments, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['kb-documents', selectedKBId, selectedKB?.source_document_ids, user?.id],
    enabled: !!user && !!selectedKBId && !!selectedKB,
    queryFn: async () => {
      const docIds: string[] = selectedKB?.source_document_ids || [];
      if (docIds.length === 0) return [];

      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id)
        .in('id', docIds);

      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Reset page when filters or KB change
  useEffect(() => {
    setCurrentPage(1);
  }, [docSearchTerm, docSelectedCategory, docSortBy, selectedKBId]);

  // Reset doc filters when switching KBs
  useEffect(() => {
    setDocSearchTerm('');
    setDocSelectedCategory(null);
    setDocSortBy('created_desc');
    setSuggestedDocs([]);
  }, [selectedKBId]);

  // Persist sidebar collapse
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('kb-sidebar-collapsed', String(newState));
  };

  // Filter sidebar KBs by search
  const filteredKBs = (knowledgeBases || []).filter((kb) => {
    if (!searchQuery) return true;
    return kb.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter and sort documents
  const filteredDocuments = (kbDocuments || []).filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(docSearchTerm.toLowerCase()) ||
      doc.ai_summary?.toLowerCase().includes(docSearchTerm.toLowerCase());
    const matchesCategory = !docSelectedCategory || doc.category === docSelectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (docSortBy) {
      case 'created_desc':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'created_asc':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const paginatedDocuments = sortedDocuments.slice(startIndex, startIndex + documentsPerPage);

  const categories = ['prompts', 'marketing', 'specs', 'general', 'research', 'planning', 'strategy', 'notes', 'reference'];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      prompts: 'bg-primary',
      marketing: 'bg-accent',
      specs: 'bg-secondary',
      general: 'bg-muted',
    };
    return colors[category] || 'bg-muted';
  };

  // Create KB mutation
  const createKB = useMutation({
    mutationFn: async (data: { title: string; type: string }) => {
      const { data: result, error } = await supabase
        .from('knowledge_bases')
        .insert({
          title: data.title,
          type: data.type,
          user_id: user!.id,
          content: {},
          source_document_ids: [],
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setIsCreating(false);
      setCreateTitle('');
      setCreateType('general');
      setSelectedKBId(result.id);
      toast({ title: 'Knowledge Base Created', description: 'Your new knowledge base is ready.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  // Update KB mutation
  const updateKB = useMutation({
    mutationFn: async (data: { id: string; title: string; description: string; type: string }) => {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ title: data.title, description: data.description, type: data.type, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setIsEditing(false);
      toast({ title: 'Updated', description: 'Knowledge base updated.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update knowledge base', variant: 'destructive' });
    },
  });

  // Delete KB mutation
  const deleteKB = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_bases')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setSelectedKBId(null);
      setDeleteConfirmOpen(false);
      toast({ title: 'Deleted', description: 'Knowledge base has been deleted.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete knowledge base', variant: 'destructive' });
    },
  });

  // Remove document from KB
  const removeDocFromKB = async (docId: string) => {
    if (!selectedKB || !user) return;
    const currentIds: string[] = selectedKB.source_document_ids || [];
    const newIds = currentIds.filter((id) => id !== docId);

    const { error } = await supabase
      .from('knowledge_bases')
      .update({ source_document_ids: newIds, updated_at: new Date().toISOString() })
      .eq('id', selectedKB.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user.id] });
    toast({ title: 'Removed', description: 'Document removed from this knowledge base.' });
  };

  // Generate insights mutation
  const generateInsights = useMutation({
    mutationFn: async (docId: string) => {
      const { data: doc, error: docError } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('id', docId)
        .eq('user_id', user!.id)
        .single();
      if (docError) throw new Error(docError.message);

      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('ai-document-analysis', {
        body: { document_id: docId, user_id: user!.id, content: doc.content || '', title: doc.title },
      });
      if (analysisError) throw new Error(analysisError.message);

      const { error } = await supabase
        .from('knowledge_documents')
        .update({ ai_insights: analysisResult.insights, ai_summary: analysisResult.summary, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setGeneratingDocId(null);
      queryClient.invalidateQueries({ queryKey: ['kb-documents', selectedKBId, user?.id] });
      toast({ title: 'AI Insights Generated' });
    },
    onError: (error) => {
      setGeneratingDocId(null);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  // AI Document Suggestion
  const handleSuggestDocuments = async () => {
    if (!selectedKB || !user) return;
    setIsSuggesting(true);
    setSuggestedDocs([]);

    try {
      const currentIds: string[] = selectedKB.source_document_ids || [];
      const { data: allDocs, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, ai_summary, category, file_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const unassigned = (allDocs || []).filter((d) => !currentIds.includes(d.id));

      if (unassigned.length === 0) {
        toast({ title: 'No Documents Available', description: 'All your documents are already in this knowledge base.' });
        return;
      }

      // Build compact candidate list - send all titles but cap summaries to fit payload
      const maxCandidates = 40;
      const summaryLen = unassigned.length > 20 ? 80 : 120;
      const candidates = unassigned.slice(0, maxCandidates).map((d) => ({
        id: d.id,
        t: d.title,
        c: d.category || '',
        s: d.ai_summary?.slice(0, summaryLen) || '',
      }));

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Not authenticated');

      const kbDesc = selectedKB.description ? `, description: "${selectedKB.description.slice(0, 100)}"` : '';
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          query: `Pick documents most relevant to a knowledge base titled "${selectedKB.title}" (type: ${selectedKB.type}${kbDesc}). Each candidate has id, t(title), c(category), s(summary). Return ONLY a JSON array of up to 5 IDs like ["id1","id2"]. Candidates: ${JSON.stringify(candidates)}`,
          use_documents: false,
        }),
      });

      if (!response.ok) throw new Error('AI suggestion failed');
      const result = await response.json();

      // Parse the AI response for document IDs
      let suggestedIds: string[] = [];
      try {
        const match = result.response?.match(/\[[\s\S]*?\]/);
        if (match) {
          suggestedIds = JSON.parse(match[0]);
        }
      } catch {
        // If parsing fails, show all unassigned (limited to 5)
        suggestedIds = unassigned.slice(0, 5).map((d) => d.id);
      }

      const suggestions = unassigned.filter((d) => suggestedIds.includes(d.id));
      setSuggestedDocs(suggestions.length > 0 ? suggestions : unassigned.slice(0, 5));
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to get suggestions', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
    }
  };

  // Accept a suggested document
  const acceptSuggestion = async (docId: string) => {
    if (!selectedKB || !user) return;
    const currentIds: string[] = selectedKB.source_document_ids || [];
    if (currentIds.includes(docId)) return;

    const { error } = await supabase
      .from('knowledge_bases')
      .update({ source_document_ids: [...currentIds, docId], updated_at: new Date().toISOString() })
      .eq('id', selectedKB.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setSuggestedDocs((prev) => prev.filter((d) => d.id !== docId));
    queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user.id] });
    toast({ title: 'Added', description: 'Document added to this knowledge base.' });
  };

  // Start editing
  const startEditing = () => {
    if (!selectedKB) return;
    setEditTitle(selectedKB.title);
    setEditDescription(selectedKB.description || '');
    setEditType(selectedKB.type);
    setIsEditing(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    createKB.mutate({ title: createTitle.trim(), type: createType });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKB || !editTitle.trim()) return;
    updateKB.mutate({ id: selectedKB.id, title: editTitle.trim(), description: editDescription, type: editType });
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof Brain> = {
      prompts: Brain,
      marketing: BarChart3,
      specs: BookOpen,
      general: Lightbulb,
    };
    return icons[type] || Lightbulb;
  };

  const handleViewDocument = (doc: any) => {
    setViewerDocument(doc);
    setIsViewerOpen(true);
  };

  const handleDeleteDocument = (doc: any) => {
    setDocumentToDelete(doc);
    setDeleteDocConfirmOpen(true);
  };

  const confirmRemoveDocument = () => {
    if (documentToDelete) {
      removeDocFromKB(documentToDelete.id);
      setDeleteDocConfirmOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-48px)] overflow-hidden">
      <div className={`grid grid-cols-1 gap-2 h-full ${sidebarCollapsed ? 'lg:grid-cols-[80px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        {/* Sidebar */}
        <Card className={`h-full flex flex-col overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-20' : ''}`}>
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              {!sidebarCollapsed && <CardTitle>Knowledge Bases</CardTitle>}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0 flex-shrink-0"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
            {!sidebarCollapsed && <CardDescription>Select or create a knowledge base</CardDescription>}
          </CardHeader>

          <CardContent className={`space-y-2 flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {!sidebarCollapsed && (
              <>
                {/* Search */}
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search knowledge bases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                {/* Create button */}
                {!isCreating ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex-shrink-0 h-8 text-xs"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Knowledge Base
                  </Button>
                ) : (
                  <form onSubmit={handleCreateSubmit} className="space-y-2 p-3 border rounded-lg bg-muted/30 flex-shrink-0">
                    <Input
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="KB title..."
                      autoFocus
                    />
                    <Select value={createType} onValueChange={setCreateType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="prompts">Prompts</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="specs">Specifications</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={createKB.isPending} className="flex-1">
                        {createKB.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                )}

                {/* KB List */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {isLoadingKBs ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                    ) : filteredKBs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {searchQuery ? 'No matching knowledge bases' : 'No knowledge bases yet'}
                      </p>
                    ) : (
                      filteredKBs.map((kb) => {
                        const TypeIcon = getTypeIcon(kb.type);
                        return (
                          <Card
                            key={kb.id}
                            className={`cursor-pointer hover:bg-accent transition-colors ${
                              selectedKBId === kb.id ? 'border-primary' : ''
                            }`}
                            onClick={() => setSelectedKBId(kb.id)}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-start gap-2">
                                <TypeIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm line-clamp-1">{kb.title}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {kb.type?.charAt(0).toUpperCase() + kb.type?.slice(1)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {(kb.source_document_ids || []).length} docs
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {kb.updated_at ? new Date(kb.updated_at).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* Main Area */}
        <div className="h-full overflow-hidden flex flex-col">
          {selectedKB ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* KB Header */}
              <div className="flex-shrink-0 p-3 border-b">
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-semibold"
                      autoFocus
                    />
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description..."
                      rows={2}
                    />
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="prompts">Prompts</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="specs">Specifications</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={updateKB.isPending}>
                        {updateKB.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedKB.title}</h2>
                      {selectedKB.description && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedKB.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">
                          {selectedKB.type?.charAt(0).toUpperCase() + selectedKB.type?.slice(1)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {(selectedKB.source_document_ids || []).length} documents
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSuggestDocuments} disabled={isSuggesting}>
                        {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        Suggest Docs
                      </Button>
                      <Button variant="outline" size="sm" onClick={startEditing}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {suggestedDocs.length > 0 && (
                <div className="flex-shrink-0 p-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      Suggested Documents
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setSuggestedDocs([])}>
                      Dismiss
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {suggestedDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.ai_summary?.slice(0, 80)}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button size="sm" variant="ghost" onClick={() => acceptSuggestion(doc.id)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSuggestedDocs((prev) => prev.filter((d) => d.id !== doc.id))}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scoped AI Chat */}
              <div className="flex-shrink-0 px-3 pt-2 max-h-[220px] overflow-y-auto">
                <ConversationChat
                  isTemporary={true}
                  knowledgeBaseId={(selectedKB.source_document_ids || []).length > 0 ? selectedKB.id : undefined}
                />
              </div>

              {/* Document Filters - compact inline */}
              <div className="flex-shrink-0 px-3 pt-2 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px] max-w-[260px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search docs..."
                    value={docSearchTerm}
                    onChange={(e) => setDocSearchTerm(e.target.value)}
                    className="pl-7 pr-7 h-8 text-sm"
                  />
                  {docSearchTerm && (
                    <button
                      onClick={() => setDocSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select value={docSortBy} onValueChange={setDocSortBy}>
                  <SelectTrigger className="h-8 text-sm w-[150px]">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">Newest</SelectItem>
                    <SelectItem value="created_asc">Oldest</SelectItem>
                    <SelectItem value="title_asc">Title A-Z</SelectItem>
                    <SelectItem value="title_desc">Title Z-A</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant={docSelectedCategory === null ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setDocSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={docSelectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setDocSelectedCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Documents Grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <DocumentGrid
                    documents={paginatedDocuments}
                    isLoading={isLoadingDocs}
                    searchTerm={docSearchTerm}
                    selectedCategory={docSelectedCategory}
                    onViewDocument={handleViewDocument}
                    onEditDocument={handleViewDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onGenerateInsights={(docId) => {
                      setGeneratingDocId(docId);
                      generateInsights.mutate(docId);
                    }}
                    generatingDocId={generatingDocId}
                    getCategoryColor={getCategoryColor}
                  />
                </div>
                <div className="mt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={sortedDocuments.length}
                    itemsPerPage={documentsPerPage}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center overflow-hidden">
              <CardContent className="text-center space-y-4">
                <Brain className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Knowledge Base Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a knowledge base from the list or create a new one
                  </p>
                  <Button onClick={() => { setIsCreating(true); if (sidebarCollapsed) toggleSidebar(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Knowledge Base
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Document Viewer */}
      <DocumentViewerModal
        document={viewerDocument}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerDocument(null);
        }}
      />

      {/* Delete KB Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => selectedKB && deleteKB.mutate(selectedKB.id)}
        title="Delete Knowledge Base"
        description={`Are you sure you want to delete "${selectedKB?.title}"? Documents will not be deleted, only the KB grouping.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Remove Doc from KB Confirmation */}
      <ConfirmationDialog
        isOpen={deleteDocConfirmOpen}
        onClose={() => setDeleteDocConfirmOpen(false)}
        onConfirm={confirmRemoveDocument}
        title="Remove Document"
        description={`Remove "${documentToDelete?.title}" from this knowledge base? The document itself will not be deleted.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default KnowledgeBases;
