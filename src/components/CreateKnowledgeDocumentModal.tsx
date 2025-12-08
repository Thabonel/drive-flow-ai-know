import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Brain, Tag, X } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CreateKnowledgeDocumentModalProps {
  trigger?: React.ReactNode;
}

const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TITLE_LENGTH = 500;

// Default categories that are always available
const DEFAULT_CATEGORIES = [
  'prompts',
  'marketing',
  'specs',
  'general',
  'research',
  'planning',
  'strategy',
  'notes',
  'reference'
];

export const CreateKnowledgeDocumentModal = ({ trigger }: CreateKnowledgeDocumentModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [contentSize, setContentSize] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unique categories from user's existing documents
  const { data: customCategories = [] } = useQuery({
    queryKey: ['document-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('category')
        .eq('user_id', user!.id)
        .not('category', 'is', null);

      if (error) throw error;

      // Get unique categories that aren't in the default list
      const uniqueCategories = [...new Set(data.map(d => d.category))]
        .filter((cat): cat is string =>
          cat !== null &&
          cat.trim() !== '' &&
          !DEFAULT_CATEGORIES.includes(cat.toLowerCase())
        );

      return uniqueCategories;
    },
    enabled: !!user,
  });

  // Combine default and custom categories
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const createDocument = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from('knowledge_documents')
        .insert([
          {
            title: data.title,
            content: data.content,
            category: data.category || null, // Set to null if empty, will be auto-categorized
            tags: data.tags,
            file_type: 'manual',
            google_file_id: `manual-${Date.now()}`, // Unique ID for manual docs
            user_id: user!.id,
          }
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: async (result) => {
      // If no category was provided, trigger AI analysis to auto-categorize
      if (!result.category || result.category.trim() === '') {
        try {
          await supabase.functions.invoke('ai-document-analysis', {
            body: { document_id: result.id }
          });
          console.log('AI categorization triggered for document:', result.id);
        } catch (error) {
          console.error('Failed to trigger AI categorization:', error);
          // Don't block the success flow if AI categorization fails
        }
      }

      queryClient.invalidateQueries({ queryKey: ['recent-documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['document-categories', user?.id] }); // Refresh categories list
      setIsOpen(false);
      resetForm();
      toast({
        title: 'Document Created',
        description: result.category ?
          'Your knowledge document has been created successfully.' :
          'Your knowledge document has been created. AI is analyzing to assign a category...',
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

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: []
    });
    setNewTag('');
    setNewCategory('');
    setShowNewCategoryInput(false);
    setContentSize(0);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const sizeBytes = new Blob([newContent]).size;

    // Prevent paste/input that exceeds limit
    if (sizeBytes > MAX_CONTENT_SIZE) {
      toast({
        title: 'Content too large',
        description: `Maximum content size is ${(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(0)}MB`,
        variant: 'destructive',
      });
      return;
    }

    setFormData({ ...formData, content: newContent });
    setContentSize(sizeBytes);
  };

  const handleCategorySelect = (value: string) => {
    if (value === 'create-new') {
      setShowNewCategoryInput(true);
      setFormData({ ...formData, category: '' });
    } else {
      setFormData({ ...formData, category: value });
      setShowNewCategoryInput(false);
    }
  };

  const handleNewCategorySubmit = () => {
    if (newCategory.trim()) {
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
      setShowNewCategoryInput(false);
    }
  };

  const handleNewCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNewCategorySubmit();
    } else if (e.key === 'Escape') {
      setNewCategory('');
      setShowNewCategoryInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and content.',
        variant: 'destructive',
      });
      return;
    }

    // Validate title length
    if (formData.title.length > MAX_TITLE_LENGTH) {
      toast({
        title: 'Error',
        description: `Title is too long. Maximum ${MAX_TITLE_LENGTH} characters allowed.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate content size
    if (contentSize > MAX_CONTENT_SIZE) {
      toast({
        title: 'Error',
        description: `Content is too large. Maximum size: ${(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(0)}MB. Current size: ${(contentSize / 1024 / 1024).toFixed(2)}MB`,
        variant: 'destructive',
      });
      return;
    }

    createDocument.mutate(formData);
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

  const generateWithAI = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title first to generate content.',
        variant: 'destructive',
      });
      return;
    }

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-query', {
          body: {
            query: `Write content for a document titled: "${formData.title}". Include main sections, key points, and useful info. Use markdown format.`
          }
        });

        if (error) {
          // Check if it's an Overloaded error
          const errorStr = JSON.stringify(error);
          if (errorStr.includes('Overloaded') && attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`API overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Try again
          }
          throw error;
        }

        const generatedContent = data.response || 'AI-generated content will appear here.';
        const sizeBytes = new Blob([generatedContent]).size;

        // Check if generated content exceeds size limit
        if (sizeBytes > MAX_CONTENT_SIZE) {
          toast({
            title: 'Content too large',
            description: `AI generated ${(sizeBytes / 1024 / 1024).toFixed(2)}MB of content, which exceeds the ${(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(0)}MB limit. Try a more specific title.`,
            variant: 'destructive',
          });
          return;
        }

        setFormData({
          ...formData,
          content: generatedContent
        });
        setContentSize(sizeBytes);

        toast({
          title: 'Content Generated',
          description: 'AI has generated content based on your title.',
        });
        return; // Exit on success

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Error generating content, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed
    console.error('Error generating content after retries:', lastError);
    const errorStr = JSON.stringify(lastError);
    const isOverloaded = errorStr.includes('Overloaded') || errorStr.includes('api_error');

    toast({
      title: isOverloaded ? 'AI Service Temporarily Unavailable' : 'Error',
      description: isOverloaded
        ? 'The AI provider is experiencing high load. Please try again in a moment.'
        : 'Failed to generate content. Please try again.',
      variant: 'destructive',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" className="h-12">
            <Plus className="h-5 w-5 mr-2" />
            Create Knowledge Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Create New Knowledge Document
          </DialogTitle>
          <DialogDescription>
            Create a new document from scratch or let AI help generate content based on your title.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter document title"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateWithAI}
                disabled={!formData.title.trim()}
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
            <Textarea
              id="content"
              value={formData.content}
              onChange={handleContentChange}
              placeholder="Enter document content or use AI to generate..."
              rows={8}
              required
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>
                Size: {(contentSize / 1024).toFixed(2)} KB / {(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(0)} MB
              </span>
              {contentSize > MAX_CONTENT_SIZE * 0.8 && (
                <span className="text-orange-500 font-medium">
                  Approaching size limit
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            {!showNewCategoryInput ? (
              <Select
                value={formData.category}
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {/* Default categories */}
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                  {/* Custom categories from user's documents */}
                  {customCategories.length > 0 && (
                    <>
                      <SelectItem value="---custom-separator---" disabled className="text-xs text-muted-foreground">
                        ── Your Categories ──
                      </SelectItem>
                      {customCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* Create new option */}
                  <SelectItem value="create-new" className="text-primary font-medium">
                    + Create New Category
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex space-x-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name..."
                  onKeyDown={handleNewCategoryKeyDown}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleNewCategorySubmit}
                  disabled={!newCategory.trim()}
                  size="sm"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategory('');
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
            {formData.category && !showNewCategoryInput && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{formData.category}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
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
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeTag(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createDocument.isPending}
            >
              {createDocument.isPending ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};