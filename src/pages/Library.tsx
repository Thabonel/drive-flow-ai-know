import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Brain, Plus, BookOpen, Lightbulb, BarChart3, Clock, Settings,
  FileText, Upload, ChevronDown, ChevronRight, Trash2, FolderPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PageHelp } from '@/components/PageHelp';
import { AIQueryInput } from '@/components/AIQueryInput';
import { DocumentGrid } from '@/components/DocumentGrid';
import { DocumentSearchFilter } from '@/components/DocumentSearchFilter';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PaginationControls } from '@/components/PaginationControls';
import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';
import DocumentSources from '@/components/DocumentSources';
import DragDropUpload from '@/components/DragDropUpload';

// ── Knowledge Bases Tab ─────────────────────────────────────────────

function KnowledgeBasesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedKB, setExpandedKB] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createType, setCreateType] = useState('general');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', type: 'general' });
  const regenerateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: knowledgeBases, isLoading } = useQuery({
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
    }
  });

  // Fetch documents for expanded KB
  const { data: kbDocuments } = useQuery({
    queryKey: ['kb-documents', expandedKB],
    enabled: !!expandedKB,
    queryFn: async () => {
      const kb = knowledgeBases?.find(k => k.id === expandedKB);
      if (!kb?.source_document_ids?.length) return [];
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, file_type, category, created_at, ai_summary')
        .in('id', kb.source_document_ids);
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const createKnowledgeBase = useMutation({
    mutationFn: async (data: { title: string; description: string; type: string }) => {
      const { data: result, error } = await supabase
        .from('knowledge_bases')
        .insert([{
          title: data.title,
          description: data.description,
          type: data.type,
          user_id: user!.id,
          content: {},
          source_document_ids: [],
          is_active: true
        }])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setShowCreateForm(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateType('general');
      toast({ title: 'Knowledge Base Created', description: 'Your new knowledge base has been created.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  const regenerateKB = useMutation({
    mutationFn: async (kbId: string) => {
      const { data: kb, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*, source_document_ids')
        .eq('id', kbId)
        .eq('user_id', user!.id)
        .single();
      if (kbError) throw new Error(kbError.message);

      const { data: documents, error: docsError } = await supabase
        .from('knowledge_documents')
        .select('*')
        .in('id', kb.source_document_ids || []);
      if (docsError) throw new Error(docsError.message);

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-document-analysis', {
        body: { knowledge_base_id: kbId, documents, type: kb.type, regenerate: true }
      });
      if (aiError) throw new Error(aiError.message);

      const { error } = await supabase
        .from('knowledge_bases')
        .update({
          updated_at: new Date().toISOString(),
          ai_generated_content: aiResult.generated_content,
          content: aiResult.structured_content,
          last_updated_from_source: new Date().toISOString()
        })
        .eq('id', kbId)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      toast({ title: 'Knowledge Base Regenerated', description: 'Content has been updated from source documents.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  const debouncedRegenerate = useCallback((kbId: string) => {
    if (regenerateTimerRef.current) clearTimeout(regenerateTimerRef.current);
    regenerateTimerRef.current = setTimeout(() => {
      regenerateKB.mutate(kbId);
    }, 3000);
  }, [regenerateKB]);

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
      toast({ title: 'Knowledge Base Updated' });
    }
  });

  const deleteKB = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_bases').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setIsDetailsOpen(false);
      setSelectedKB(null);
      toast({ title: 'Knowledge Base Deleted' });
    }
  });

  // Upload files directly into a KB
  const handleFilesAddedToKB = async (kbId: string, documents: any[]) => {
    if (!documents.length) return;
    const kb = knowledgeBases?.find(k => k.id === kbId);
    if (!kb) return;

    // Get new document IDs
    const newDocIds = documents.map(d => d.id).filter(Boolean);
    if (!newDocIds.length) {
      // Documents might come from DragDropUpload without IDs - refetch
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast({ title: 'Documents uploaded', description: 'Files uploaded. Assign them to this KB from All Documents tab.' });
      return;
    }

    const updatedIds = [...(kb.source_document_ids || []), ...newDocIds];
    const { error } = await supabase
      .from('knowledge_bases')
      .update({ source_document_ids: updatedIds, updated_at: new Date().toISOString() })
      .eq('id', kbId)
      .eq('user_id', user!.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['kb-documents', kbId] });
    toast({ title: 'Documents added to KB', description: `${newDocIds.length} document(s) added.` });
    debouncedRegenerate(kbId);
  };

  const handleViewDetails = (kb: any) => {
    setSelectedKB(kb);
    setEditFormData({ title: kb.title, description: kb.description || '', type: kb.type });
    setIsDetailsOpen(true);
    setIsEditing(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    createKnowledgeBase.mutate({ title: createTitle, description: createDescription, type: createType });
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof Brain> = { prompts: Brain, marketing: BarChart3, specs: BookOpen, general: Lightbulb };
    return icons[type] || Lightbulb;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { prompts: 'bg-blue-500', marketing: 'bg-green-500', specs: 'bg-purple-500', general: 'bg-gray-500' };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Create KB inline form */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Knowledge Base</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kb-title">Title</Label>
                  <Input id="kb-title" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="e.g. Weight Loss Research" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kb-type">Type</Label>
                  <Select value={createType} onValueChange={setCreateType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="prompts">Prompts</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="specs">Specifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-desc">Description (optional)</Label>
                <Textarea id="kb-desc" value={createDescription} onChange={e => setCreateDescription(e.target.value)} placeholder="What is this knowledge base about?" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createKnowledgeBase.isPending}>
                  {createKnowledgeBase.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Knowledge Base
        </Button>
      )}

      {/* KB Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : !knowledgeBases?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No knowledge bases yet</h3>
            <p className="text-muted-foreground mb-4">Create your first knowledge base to organize documents and let AI answer questions about them.</p>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Knowledge Base
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeBases.map(kb => {
            const TypeIcon = getTypeIcon(kb.type);
            const isExpanded = expandedKB === kb.id;
            return (
              <Card key={kb.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${getTypeColor(kb.type)} bg-opacity-10`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary">{kb.type.charAt(0).toUpperCase() + kb.type.slice(1)}</Badge>
                    </div>
                    <Badge variant={kb.is_active ? 'default' : 'secondary'}>{kb.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <CardTitle className="text-lg">{kb.title}</CardTitle>
                  {kb.description && <CardDescription className="line-clamp-2">{kb.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {kb.source_document_ids?.length || 0} docs
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {kb.last_updated_from_source ? new Date(kb.last_updated_from_source).toLocaleDateString() : 'Never'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setExpandedKB(isExpanded ? null : kb.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                      {isExpanded ? 'Collapse' : 'Docs'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(kb)}>
                      <Settings className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => regenerateKB.mutate(kb.id)} disabled={regenerateKB.isPending}>
                      <Brain className="h-4 w-4 mr-1" />
                      {regenerateKB.isPending ? '...' : 'Regen'}
                    </Button>
                  </div>

                  {/* Expanded: show docs + upload zone */}
                  {isExpanded && (
                    <div className="border-t pt-3 space-y-3">
                      {kbDocuments && kbDocuments.length > 0 ? (
                        <ul className="space-y-1">
                          {kbDocuments.map(doc => (
                            <li key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{doc.title}</span>
                              <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">{doc.file_type}</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No documents yet.</p>
                      )}
                      <div className="pt-2">
                        <DragDropUpload onFilesAdded={(docs) => handleFilesAddedToKB(kb.id, docs)} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* KB Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {isEditing ? 'Edit Knowledge Base' : selectedKB?.title}
              <div className="flex gap-2">
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => {
                  if (selectedKB && confirm('Are you sure you want to delete this knowledge base?')) {
                    deleteKB.mutate(selectedKB.id);
                  }
                }} disabled={deleteKB.isPending}>
                  {deleteKB.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedKB && (
            isEditing ? (
              <form onSubmit={e => { e.preventDefault(); updateKB.mutate({ id: selectedKB.id, ...editFormData }); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editFormData.title} onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editFormData.type} onValueChange={v => setEditFormData({ ...editFormData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="prompts">Prompts</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="specs">Specifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateKB.isPending}>{updateKB.isPending ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-muted-foreground">{selectedKB.description || 'No description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Type</h4>
                    <Badge variant="secondary">{selectedKB.type.charAt(0).toUpperCase() + selectedKB.type.slice(1)}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Documents</h4>
                    <p className="text-muted-foreground">{selectedKB.source_document_ids?.length || 0} source documents</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Last Updated</h4>
                  <p className="text-muted-foreground">{selectedKB.last_updated_from_source ? new Date(selectedKB.last_updated_from_source).toLocaleString() : 'Never'}</p>
                </div>
                {selectedKB.ai_generated_content && (
                  <div>
                    <h4 className="font-medium mb-1">AI-Generated Content</h4>
                    <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedKB.ai_generated_content}</pre>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── All Documents Tab ───────────────────────────────────────────────

function AllDocumentsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('created_desc');
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [assignKBId, setAssignKBId] = useState<string>('');
  const documentsPerPage = 12;

  const { data: documents, isLoading, isError, error } = useQuery({
    queryKey: ['documents', user?.id, sortBy],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase.from('knowledge_documents').select('*').eq('user_id', user!.id);
      switch (sortBy) {
        case 'created_desc': query = query.order('created_at', { ascending: false }); break;
        case 'created_asc': query = query.order('created_at', { ascending: true }); break;
        case 'modified_desc': query = query.order('drive_modified_at', { ascending: false, nullsFirst: false }); break;
        case 'modified_asc': query = query.order('drive_modified_at', { ascending: true, nullsFirst: false }); break;
        case 'title_asc': query = query.order('title', { ascending: true }); break;
        case 'title_desc': query = query.order('title', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledge-bases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('knowledge_bases').select('id, title, source_document_ids').eq('user_id', user!.id);
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const generateInsights = useMutation({
    mutationFn: async (docId: string) => {
      const { data: doc, error: docError } = await supabase.from('knowledge_documents').select('*').eq('id', docId).eq('user_id', user!.id).single();
      if (docError) throw new Error(docError.message);
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('ai-document-analysis', {
        body: { document_id: docId, user_id: user!.id, content: doc.content || '', title: doc.title }
      });
      if (analysisError) throw new Error(analysisError.message);
      const { error } = await supabase.from('knowledge_documents').update({ ai_insights: analysisResult.insights, ai_summary: analysisResult.summary, updated_at: new Date().toISOString() }).eq('id', docId).eq('user_id', user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setGeneratingDocId(null);
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast({ title: 'AI Insights Generated' });
    },
    onError: (error) => {
      setGeneratingDocId(null);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  const assignToKB = useMutation({
    mutationFn: async ({ kbId, docIds }: { kbId: string; docIds: string[] }) => {
      const kb = knowledgeBases?.find(k => k.id === kbId);
      if (!kb) throw new Error('Knowledge base not found');
      const updatedIds = [...new Set([...(kb.source_document_ids || []), ...docIds])];
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ source_document_ids: updatedIds, updated_at: new Date().toISOString() })
        .eq('id', kbId)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
      return { count: docIds.length, kbTitle: kb.title };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setSelectedDocs([]);
      setAssignKBId('');
      toast({ title: 'Documents assigned', description: `${result.count} document(s) added to "${result.kbTitle}".` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    },
  });

  const confirmDeleteDocument = async () => {
    if (!documentToDelete || !user) return;
    try {
      // Clean document from any KB's source_document_ids
      const affectedKBs = knowledgeBases?.filter(kb => kb.source_document_ids?.includes(documentToDelete.id)) || [];
      for (const kb of affectedKBs) {
        const updatedIds = (kb.source_document_ids || []).filter((id: string) => id !== documentToDelete.id);
        await supabase
          .from('knowledge_bases')
          .update({ source_document_ids: updatedIds, updated_at: new Date().toISOString() })
          .eq('id', kb.id)
          .eq('user_id', user.id);
      }

      const { error } = await supabase.from('knowledge_documents').delete().eq('id', documentToDelete.id).eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user.id] });
      toast({ title: 'Document Deleted', description: 'The document has been deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete document', variant: 'destructive' });
    }
  };

  // Get KB name for a document
  const getDocKB = (docId: string) => {
    return knowledgeBases?.find(kb => kb.source_document_ids?.includes(docId));
  };

  const categories = ['prompts', 'marketing', 'specs', 'general', 'research', 'planning', 'strategy', 'notes', 'reference'];

  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory && !doc.is_archived;
  });

  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + documentsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, sortBy]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = { prompts: 'bg-primary', marketing: 'bg-accent', specs: 'bg-secondary', general: 'bg-muted' };
    return colors[category] || 'bg-muted';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreateKnowledgeDocumentModal
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            }
          />
        </div>
        {/* Bulk assign controls */}
        {selectedDocs.length > 0 && knowledgeBases && knowledgeBases.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedDocs.length} selected</span>
            <Select value={assignKBId} onValueChange={setAssignKBId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Assign to KB..." /></SelectTrigger>
              <SelectContent>
                {knowledgeBases.map(kb => (
                  <SelectItem key={kb.id} value={kb.id}>{kb.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!assignKBId || assignToKB.isPending} onClick={() => assignToKB.mutate({ kbId: assignKBId, docIds: selectedDocs })}>
              <FolderPlus className="h-4 w-4 mr-1" />
              {assignToKB.isPending ? 'Adding...' : 'Add to KB'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedDocs([])}>Clear</Button>
          </div>
        )}
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
        <div className="text-center py-12 border rounded-lg bg-destructive/10">
          <div className="text-destructive mb-2 font-semibold">Failed to load documents</div>
          <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'An unknown error occurred'}</div>
        </div>
      )}

      {/* Document grid with selection checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedDocuments.map(doc => {
          const docKB = getDocKB(doc.id);
          return (
            <div key={doc.id} className="relative">
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={selectedDocs.includes(doc.id)}
                  onCheckedChange={(checked) => {
                    setSelectedDocs(prev => checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id));
                  }}
                />
              </div>
              {/* KB badge */}
              {docKB && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="text-xs">{docKB.title}</Badge>
                </div>
              )}
              <div className={`${selectedDocs.includes(doc.id) ? 'ring-2 ring-primary rounded-lg' : ''}`}>
                <DocumentGrid
                  documents={[doc]}
                  isLoading={false}
                  searchTerm={searchTerm}
                  selectedCategory={selectedCategory}
                  onViewDocument={(d) => { setViewerDocument(d); setIsViewerOpen(true); }}
                  onEditDocument={(d) => { setViewerDocument(d); setIsViewerOpen(true); }}
                  onDeleteDocument={(d) => { setDocumentToDelete(d); setDeleteConfirmOpen(true); }}
                  onGenerateInsights={(id) => { setGeneratingDocId(id); generateInsights.mutate(id); }}
                  generatingDocId={generatingDocId}
                  getCategoryColor={getCategoryColor}
                />
              </div>
            </div>
          );
        })}
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
        {!isLoading && paginatedDocuments.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground">Upload documents or adjust your search filters.</p>
          </div>
        )}
      </div>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredDocuments.length} itemsPerPage={documentsPerPage} />

      <DocumentViewerModal document={viewerDocument} isOpen={isViewerOpen} onClose={() => { setIsViewerOpen(false); setViewerDocument(null); }} />

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        description={`Are you sure you want to delete "${documentToDelete?.title}"? This will also remove it from any knowledge bases. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

// ── Sources Tab ─────────────────────────────────────────────────────

function SourcesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDocumentsAdded = (documents: any[]) => {
    queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
    toast({ title: 'Documents Added', description: `${documents.length} document(s) have been added.` });
  };

  return <DocumentSources onDocumentsAdded={handleDocumentsAdded} />;
}

// ── Main Library Page ───────────────────────────────────────────────

const Library = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'knowledge-bases';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Library</h1>
            <p className="text-muted-foreground">Documents & Knowledge Bases in one place</p>
          </div>
          <PageHelp
            title="Library Help"
            description="Your unified hub for documents and knowledge bases. Create KBs, upload documents, and manage everything from one page."
            tips={[
              "Knowledge Bases tab: Create KBs, expand to see docs, upload directly into a KB",
              "All Documents tab: Browse all docs, select multiple to create a KB or assign to existing",
              "Sources tab: Connect Google Drive, Dropbox, upload files, or index local folders",
              "Documents are automatically cleaned from KBs when deleted",
              "KBs auto-regenerate when documents are added (3s debounce for bulk adds)",
              "Use the AI Chat to ask 'create a document about X and add it to Y KB'"
            ]}
          />
        </div>
      </div>

      <AIQueryInput />

      <Tabs defaultValue={defaultTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="knowledge-bases" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Knowledge Bases
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Documents
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge-bases" className="mt-6">
          <KnowledgeBasesTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <AllDocumentsTab />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <SourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Library;
