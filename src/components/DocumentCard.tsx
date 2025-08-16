import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Tag, Brain, Edit } from 'lucide-react';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    ai_summary?: string;
    category: string;
    created_at?: string;
    drive_modified_at?: string;
    tags?: string[];
    file_type: string;
    file_size?: number;
  };
  onView: (doc: any) => void;
  onEdit: (doc: any) => void;
  onGenerateInsights: (docId: string) => void;
  isGeneratingInsights: boolean;
  getCategoryColor: (category: string) => string;
}

export const DocumentCard = ({
  document: doc,
  onView,
  onEdit,
  onGenerateInsights,
  isGeneratingInsights,
  getCategoryColor,
}: DocumentCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown date'}
          </div>
          {doc.drive_modified_at && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Modified: {new Date(doc.drive_modified_at).toLocaleDateString()}
            </div>
          )}
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onView(doc)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(doc)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onGenerateInsights(doc.id)}
            disabled={isGeneratingInsights}
          >
            <Brain className="h-4 w-4 mr-2" />
            {isGeneratingInsights ? 'Generating...' : 'AI Insights'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};