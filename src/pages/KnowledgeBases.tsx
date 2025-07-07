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

const KnowledgeBases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
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
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const regenerateKB = useMutation({
    mutationFn: async (kbId: string) => {
      // Simulate AI regeneration by updating the updated_at timestamp and content
      const { data, error } = await supabase
        .from('knowledge_bases')
        .update({ 
          updated_at: new Date().toISOString(),
          ai_generated_content: 'Regenerated content...' 
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
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleViewDetails = (kbId: string) => {
    // For now, show details in a toast - in a real app this would open a detailed view
    const kb = knowledgeBases?.find(k => k.id === kbId);
    if (kb) {
      toast({
        title: kb.title,
        description: `Type: ${kb.type} | Created: ${new Date(kb.created_at).toLocaleDateString()}`,
      });
    }
  };

  const handleRegenerate = (kbId: string) => {
    regenerateKB.mutate(kbId);
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Bases</h1>
            <p className="text-muted-foreground">AI-generated collections of synthesized knowledge</p>
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
                    AI will automatically create knowledge bases as you add more documents
                  </p>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Manual Knowledge Base
                    </Button>
                  </DialogTrigger>
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
                <h4 className="font-medium text-foreground mb-2">Content Synthesis</h4>
                <p className="text-sm text-muted-foreground">
                  Related content is merged and synthesized into comprehensive knowledge bases
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Actionable Insights</h4>
                <p className="text-sm text-muted-foreground">
                  Generated knowledge bases provide actionable insights and recommendations
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
  );
};

export default KnowledgeBases;