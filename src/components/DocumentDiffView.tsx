import { useState } from 'react';
import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Edit, Columns, FileText, Loader2 } from 'lucide-react';

interface DocumentDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  changeSummary: string;
  changeHighlights: string[];
  onApprove: (content: string) => Promise<void>;
  onReject: () => void;
  onEdit?: (content: string) => void;
  isApproving?: boolean;
}

export function DocumentDiffView({
  originalContent,
  suggestedContent,
  changeSummary,
  changeHighlights,
  onApprove,
  onReject,
  onEdit,
  isApproving = false,
}: DocumentDiffViewProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [editedContent, setEditedContent] = useState(suggestedContent);
  const [isEditing, setIsEditing] = useState(false);

  // Generate unified diff
  const unifiedDiff = Diff.createPatch(
    'document',
    originalContent,
    suggestedContent,
    'Original',
    'Suggested'
  );

  // Generate word-by-word diff for highlighting
  const wordDiff = Diff.diffWords(originalContent, suggestedContent);

  const handleApprove = async () => {
    await onApprove(isEditing ? editedContent : suggestedContent);
  };

  const renderUnifiedDiff = () => {
    const lines = unifiedDiff.split('\n').slice(4); // Skip header lines

    return (
      <div className="font-mono text-sm">
        {lines.map((line, index) => {
          let className = 'px-4 py-0.5 ';
          if (line.startsWith('+')) {
            className += 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
          } else if (line.startsWith('-')) {
            className += 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
          } else if (line.startsWith('@@')) {
            className += 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold';
          } else {
            className += 'text-muted-foreground';
          }

          return (
            <div key={index} className={className}>
              {line || ' '}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWordDiff = (content: typeof wordDiff, showType: 'original' | 'suggested') => {
    return (
      <div className="whitespace-pre-wrap text-sm">
        {content.map((part, index) => {
          if (showType === 'original') {
            // For original view: show unchanged and removed parts
            if (part.added) return null;
            if (part.removed) {
              return (
                <span
                  key={index}
                  className="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 line-through"
                >
                  {part.value}
                </span>
              );
            }
            return <span key={index}>{part.value}</span>;
          } else {
            // For suggested view: show unchanged and added parts
            if (part.removed) return null;
            if (part.added) {
              return (
                <span
                  key={index}
                  className="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                >
                  {part.value}
                </span>
              );
            }
            return <span key={index}>{part.value}</span>;
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Change Summary */}
      <div className="p-4 border rounded-lg bg-accent/5 border-accent/20">
        <h4 className="font-medium mb-2">Summary of Changes</h4>
        <p className="text-sm text-muted-foreground mb-3">{changeSummary}</p>
        {changeHighlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {changeHighlights.map((highlight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'split' | 'unified')}>
          <TabsList className="grid w-48 grid-cols-2">
            <TabsTrigger value="split" className="text-xs">
              <Columns className="h-3 w-3 mr-1" />
              Split
            </TabsTrigger>
            <TabsTrigger value="unified" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Unified
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isEditing && (
          <Badge variant="secondary">Editing suggested content</Badge>
        )}
      </div>

      {/* Diff View */}
      <div className="border rounded-lg overflow-hidden">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 divide-x">
            {/* Original */}
            <div>
              <div className="bg-muted px-4 py-2 border-b">
                <h5 className="font-medium text-sm text-red-600 dark:text-red-400">
                  Original
                </h5>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-4">
                  {renderWordDiff(wordDiff, 'original')}
                </div>
              </ScrollArea>
            </div>

            {/* Suggested */}
            <div>
              <div className="bg-muted px-4 py-2 border-b">
                <h5 className="font-medium text-sm text-green-600 dark:text-green-400">
                  Suggested
                </h5>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full min-h-[350px] p-2 text-sm bg-background border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    renderWordDiff(wordDiff, 'suggested')
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-muted px-4 py-2 border-b">
              <h5 className="font-medium text-sm">Unified Diff</h5>
            </div>
            <ScrollArea className="h-[400px]">
              {renderUnifiedDiff()}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isApproving}
        >
          <X className="h-4 w-4 mr-2" />
          Reject Changes
        </Button>

        {onEdit && (
          <Button
            variant="outline"
            onClick={() => {
              if (isEditing) {
                setEditedContent(suggestedContent);
              }
              setIsEditing(!isEditing);
            }}
            disabled={isApproving}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel Edit' : 'Edit Before Approving'}
          </Button>
        )}

        <Button
          onClick={handleApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Approve Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
