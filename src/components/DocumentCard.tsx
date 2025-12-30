import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Calendar as CalendarIcon, Tag, BookOpen, Edit, Trash2, BarChart3, FileSpreadsheet, Clock } from 'lucide-react';
import { DocumentVisualizationPanel } from './DocumentVisualizationPanel';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import { ExtractToTimelineDialog } from './ai/ExtractToTimelineDialog';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  const hasSpreadsheetData = doc.metadata?.spreadsheetData || 
                           doc.file_type?.includes('spreadsheet') || 
                           doc.file_type?.includes('excel') || 
                           doc.file_type?.includes('csv');

  const hasChartableData = doc.metadata?.chartableDatasets?.length > 0 || hasSpreadsheetData;

  return (
    <TooltipProvider delayDuration={300}>
    <>
    <Card
      data-document-card
      className="hover:shadow-lg transition-all duration-200 h-full flex flex-col"
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-lg line-clamp-2 pr-4">{doc.title}</CardTitle>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getCategoryColor(doc.category)}`} />
        </div>
        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
          {doc.ai_summary}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}
          </div>
          {doc.drive_modified_at && (
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              {new Date(doc.drive_modified_at).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
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
        
        <div className="flex flex-col gap-3 mt-auto pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(doc)}
              className="flex-1 min-w-[100px]"
            >
              <FileText className="h-4 w-4 mr-2" />
              View
            </Button>
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(doc)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Delete document
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {(hasSpreadsheetData || hasChartableData) && (
            <div className="flex flex-wrap gap-2">
              {hasSpreadsheetData && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSpreadsheet(true)}
                  className="flex-1 min-w-[120px]"
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
                  className="flex-1 min-w-[120px]"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Charts
                </Button>
              )}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onGenerateInsights(doc.id)}
              disabled={isGeneratingInsights}
              className="flex-1 min-w-[120px]"
            >
              {isGeneratingInsights ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  AI Insights
                </>
              )}
            </Button>

            {onClaudeProcess && (doc.file_type === 'pdf' || doc.file_type?.includes('sheet') || doc.file_type?.includes('document')) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onClaudeProcess(doc.id)}
                className="flex-1 min-w-[120px]"
              >
                <FileText className="h-4 w-4 mr-2" />
                Claude MVP
              </Button>
            )}
          </div>

          {/* Add to Timeline */}
          {(doc.content || doc.ai_summary) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimelineDialog(true)}
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Add to Timeline
            </Button>
          )}
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

    {/* Extract to Timeline Dialog */}
    <ExtractToTimelineDialog
      open={showTimelineDialog}
      onClose={() => setShowTimelineDialog(false)}
      content={doc.content || doc.ai_summary || ''}
      sourceType="document"
      sourceTitle={doc.title}
    />
    </>
    </TooltipProvider>
  );
};