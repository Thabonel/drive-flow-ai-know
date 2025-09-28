import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Calendar, Tag, Brain, Edit, Trash2, Sparkles, BarChart3, FileSpreadsheet } from 'lucide-react';
import { DocumentVisualizationPanel } from './DocumentVisualizationPanel';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import { useState } from 'react';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    content?: string;
    ai_summary?: string;
    category: string;
    created_at?: string;
    drive_modified_at?: string;
    tags?: string[];
    file_type: string;
    file_size?: number;
    metadata?: {
      spreadsheetData?: any;
      chartableDatasets?: any[];
      hasImages?: boolean;
      pageCount?: number;
    };
  };
  onView: (doc: any) => void;
  onEdit: (doc: any) => void;
  onDelete?: (doc: any) => void;
  onGenerateInsights: (docId: string) => void;
  onClaudeProcess?: (docId: string) => void;
  isGeneratingInsights: boolean;
  getCategoryColor: (category: string) => string;
}

export const DocumentCard = ({
  document: doc,
  onView,
  onEdit,
  onDelete,
  onGenerateInsights,
  onClaudeProcess,
  isGeneratingInsights,
  getCategoryColor,
}: DocumentCardProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);

  const hasSpreadsheetData = doc.metadata?.spreadsheetData || 
                           doc.file_type?.includes('spreadsheet') || 
                           doc.file_type?.includes('excel') || 
                           doc.file_type?.includes('csv');

  const hasChartableData = doc.metadata?.chartableDatasets?.length > 0 || hasSpreadsheetData;

  return (
    <>
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
          {hasSpreadsheetData && (
            <Badge variant="outline" className="text-xs text-green-600">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Spreadsheet
            </Badge>
          )}
          {hasChartableData && (
            <Badge variant="outline" className="text-xs text-blue-600">
              <BarChart3 className="h-3 w-3 mr-1" />
              Chartable
            </Badge>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 gap-2">
          <div className="flex flex-wrap gap-2">
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
            {hasSpreadsheetData && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSpreadsheet(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Spreadsheet
              </Button>
            )}
            {hasChartableData && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowVisualization(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Charts
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDelete(doc)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onGenerateInsights(doc.id)}
              disabled={isGeneratingInsights}
            >
              {isGeneratingInsights ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  AI Insights
                </>
              )}
            </Button>
            
            {onClaudeProcess && (doc.file_type === 'pdf' || doc.file_type?.includes('sheet') || doc.file_type?.includes('document')) && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => onClaudeProcess(doc.id)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Claude MVP
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Visualization Dialog */}
    <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Visualizations - {doc.title}</DialogTitle>
        </DialogHeader>
        <DocumentVisualizationPanel
          documentId={doc.id}
          documentContent={doc.content || doc.ai_summary || ''}
          spreadsheetData={doc.metadata?.spreadsheetData}
          onClose={() => setShowVisualization(false)}
        />
      </DialogContent>
    </Dialog>

    {/* Spreadsheet Dialog */}
    {hasSpreadsheetData && (
      <Dialog open={showSpreadsheet} onOpenChange={setShowSpreadsheet}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Spreadsheet Viewer - {doc.title}</DialogTitle>
          </DialogHeader>
          <SpreadsheetViewer
            data={doc.metadata?.spreadsheetData || { 
              sheets: [], 
              metadata: { 
                totalSheets: 0, 
                hasFormulas: false, 
                hasCharts: false, 
                dataTypes: [] 
              } 
            }}
            title={doc.title}
            onGenerateCharts={(data) => {
              setShowSpreadsheet(false);
              setShowVisualization(true);
            }}
          />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};