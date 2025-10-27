import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Plus, BookOpen, Lightbulb, BarChart3, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PageHelp } from '@/components/PageHelp';

const KnowledgeBases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general'
  });
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    type: 'general'
  });

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

  const createKnowledgeBase = useMutation({
    mutationFn: async (data: { title: string; description: string; type: string }) => {
      const { data: result, error } = await supabase
        .from('knowledge_bases')
        .insert([
          {
            title: data.title,
            description: data.description,
            type: data.type,
            user_id: user!.id,
            content: {},
            source_document_ids: [],
            is_active: true
          }
        ])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', type: 'general' });
      toast({
        title: 'Knowledge Base Created',
        description: 'Your new knowledge base has been created successfully.',
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

  const seedTestData = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-test-data', {
        body: { user_id: user!.id }
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast({
        title: 'Demo Data Loaded',
        description: `Created ${data.documents_created} documents and ${data.knowledge_bases_created} knowledge bases`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Loading Demo Data',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const regenerateKB = useMutation({
    mutationFn: async (kbId: string) => {
      // Get knowledge base and its source documents
      const { data: kb, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*, source_document_ids')
        .eq('id', kbId)
        .eq('user_id', user!.id)
        .single();
      
      if (kbError) throw new Error(kbError.message);
      
      // Get source documents content
      const { data: documents, error: docsError } = await supabase
        .from('knowledge_documents')
        .select('*')
        .in('id', kb.source_document_ids || []);
      
      if (docsError) throw new Error(docsError.message);
      
      // Call AI to regenerate knowledge base content
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-document-analysis', {
        body: { 
          knowledge_base_id: kbId,
          documents: documents,
          type: kb.type,
          regenerate: true
        }
      });
      
      if (aiError) throw new Error(aiError.message);
      
      // Update knowledge base with new AI-generated content
      const { data, error } = await supabase
        .from('knowledge_bases')
        .update({ 
          updated_at: new Date().toISOString(),
          ai_generated_content: aiResult.generated_content,
          content: aiResult.structured_content,
          last_updated_from_source: new Date().toISOString()
        })
        .eq('id', kbId)
        .eq('user_id', user!.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      toast({
        title: 'Knowledge Base Regenerated',
        description: 'Your knowledge base has been regenerated with the latest information.',
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

  const updateKB = useMutation({
    mutationFn: async (data: { id: string; title: string; description: string; type: string }) => {
      const { data: result, error } = await supabase
        .from('knowledge_bases')
        .update({
          title: data.title,
          description: data.description,
          type: data.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      setIsEditing(false);
      toast({
        title: 'Knowledge Base Updated',
        description: 'Your knowledge base has been updated successfully.',
      });
    }
  });

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
      setIsDetailsOpen(false);
      setSelectedKB(null);
      toast({
        title: 'Knowledge Base Deleted',
        description: 'Your knowledge base has been deleted successfully.',
      });
    }
  });

  const handleViewDetails = (kbId: string) => {
    const kb = knowledgeBases?.find(k => k.id === kbId);
    if (kb) {
      setSelectedKB(kb);
      setEditFormData({
        title: kb.title,
        description: kb.description || '',
        type: kb.type
      });
      setIsDetailsOpen(true);
      setIsEditing(false);
    }
  };

  const handleRegenerate = (kbId: string) => {
    regenerateKB.mutate(kbId);
  };

  const loadTestData = () => {
    seedTestData.mutate();
  };

  const handleUpdateKB = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKB) {
      updateKB.mutate({
        id: selectedKB.id,
        ...editFormData
      });
    }
  };

  const handleDeleteKB = () => {
    if (selectedKB && confirm('Are you sure you want to delete this knowledge base?')) {
      deleteKB.mutate(selectedKB.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for your knowledge base.',
        variant: 'destructive',
      });
      return;
    }
    createKnowledgeBase.mutate(formData);
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      prompts: Brain,
      marketing: BarChart3,
      specs: BookOpen,
      general: Lightbulb,
    };
    return icons[type as keyof typeof icons] || Lightbulb;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      prompts: 'bg-blue-500',
      marketing: 'bg-green-500',
      specs: 'bg-purple-500',
      general: 'bg-gray-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Knowledge Bases</h1>
              <p className="text-muted-foreground">AI-generated collections of synthesized knowledge</p>
            </div>
            <PageHelp
              title="Knowledge Bases Help"
              description="Knowledge Bases are AI-generated collections of synthesized information from your documents. The AI analyzes your documents and creates comprehensive, searchable knowledge bases organized by topic or purpose."
              tips={[
                "Create knowledge bases to organize documents by topic",
                "AI automatically synthesizes and summarizes content",
                "Use different types: General, Prompts, Marketing, Specs",
                "Query specific knowledge bases for more focused results",
                "View analytics to see usage and performance metrics"
              ]}
            />
          </div>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Knowledge Base
            </Button>
          </DialogTrigger>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : !knowledgeBases || knowledgeBases.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No knowledge bases yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your Google Drive folders and sync documents to automatically generate knowledge bases
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={loadTestData} disabled={seedTestData.isPending}>
                      {seedTestData.isPending ? 'Loading...' : 'Load Demo Data'}
                    </Button>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Manual KB
                      </Button>
                    </DialogTrigger>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            knowledgeBases.map((kb) => {
              const TypeIcon = getTypeIcon(kb.type);
              return (
                <Card key={kb.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg ${getTypeColor(kb.type)} bg-opacity-10`}>
                          <TypeIcon className={`h-5 w-5 text-${kb.type === 'prompts' ? 'blue' : kb.type === 'marketing' ? 'green' : kb.type === 'specs' ? 'purple' : 'gray'}-600`} />
                        </div>
                        <Badge variant="secondary">
                          {kb.type.charAt(0).toUpperCase() + kb.type.slice(1)}
                        </Badge>
                      </div>
                      <Badge variant={kb.is_active ? 'default' : 'secondary'}>
                        {kb.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{kb.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {kb.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        {kb.source_document_ids?.length || 0} source documents
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {kb.last_updated_from_source ? new Date(kb.last_updated_from_source).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(kb.id)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRegenerate(kb.id)}
                        disabled={regenerateKB.isPending}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {regenerateKB.isPending ? 'Regenerating...' : 'Regenerate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How Knowledge Bases Work</CardTitle>
            <CardDescription>
              Understanding the AI-powered knowledge synthesis process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Document Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  AI analyzes and categorizes documents from your Google Drive folders
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Brain className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Combine Related Docs</h4>
                <p className="text-sm text-muted-foreground">
                  Group similar files together so the AI can read them all at once
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Get Answers</h4>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get answers based on everything in the collection
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new knowledge base to organize and synthesize your information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter knowledge base title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this knowledge base will contain"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select knowledge base type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="prompts">Prompts</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="specs">Specifications</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createKnowledgeBase.isPending}
            >
              {createKnowledgeBase.isPending ? 'Creating...' : 'Create Knowledge Base'}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {isEditing ? 'Edit Knowledge Base' : selectedKB?.title}
              <div className="flex gap-2">
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteKB}
                  disabled={deleteKB.isPending}
                >
                  {deleteKB.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedKB && (
            <div className="space-y-6">
              {isEditing ? (
                <form onSubmit={handleUpdateKB} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Type</Label>
                    <Select
                      value={editFormData.type}
                      onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}
                    >
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
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateKB.isPending}>
                      {updateKB.isPending ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedKB.description || 'No description available'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Type</h4>
                      <Badge variant="secondary">
                        {selectedKB.type.charAt(0).toUpperCase() + selectedKB.type.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Status</h4>
                      <Badge variant={selectedKB.is_active ? 'default' : 'secondary'}>
                        {selectedKB.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">Source Documents</h4>
                    <p className="text-muted-foreground">
                      {selectedKB.source_document_ids?.length || 0} documents contributing to this knowledge base
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">Last Updated</h4>
                    <p className="text-muted-foreground">
                      {selectedKB.last_updated_from_source 
                        ? new Date(selectedKB.last_updated_from_source).toLocaleString()
                        : 'Never updated from source'
                      }
                    </p>
                  </div>

                  {selectedKB.ai_generated_content && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">AI-Generated Content</h4>
                      <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {selectedKB.ai_generated_content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KnowledgeBases;