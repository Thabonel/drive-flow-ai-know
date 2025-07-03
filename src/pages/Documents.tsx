import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Search, Archive, Tag, Calendar, Brain } from 'lucide-react';

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data - will be replaced with real data from Supabase
  const documents = [
    {
      id: '1',
      title: 'AI Prompt Engineering Guide',
      category: 'prompts',
      tags: ['ai', 'prompts', 'engineering'],
      ai_summary: 'Comprehensive guide for creating effective AI prompts with best practices and examples.',
      drive_modified_at: '2024-01-15T10:00:00Z',
      is_archived: false,
    },
    {
      id: '2',
      title: 'Marketing Strategy Q1 2024',
      category: 'marketing',
      tags: ['marketing', 'strategy', '2024'],
      ai_summary: 'Marketing strategy document outlining goals and tactics for Q1 2024.',
      drive_modified_at: '2024-01-10T14:30:00Z',
      is_archived: false,
    },
  ];

  const categories = ['prompts', 'marketing', 'specs', 'general'];
  
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory && !doc.is_archived;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      prompts: 'bg-blue-500',
      marketing: 'bg-green-500',
      specs: 'bg-purple-500',
      general: 'bg-gray-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground">Browse and search your knowledge documents</p>
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
        {filteredDocuments.length === 0 ? (
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
                  {new Date(doc.drive_modified_at).toLocaleDateString()}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Insights
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