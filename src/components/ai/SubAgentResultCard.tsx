import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, FileText, BarChart3, ImageIcon, Download, RefreshCw, Loader2, CheckCircle2, Clock, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface SubAgentResult {
  id: string;
  agent_type: 'calendar' | 'briefing' | 'analysis' | 'creative';
  status: 'pending' | 'running' | 'completed' | 'failed';
  task_data?: {
    title?: string;
    description?: string;
    priority?: number;
    estimated_duration?: number;
  };
  result_data?: {
    message?: string;
    content?: string;
    timeline_items_created?: number;
    events?: Array<{
      title: string;
      start_time: string;
      end_time?: string;
      description?: string;
    }>;
    visual_content?: {
      title?: string;
      subtitle?: string;
      totalSlides?: number;
      slides?: Array<{
        slideNumber?: number;
        title?: string;
        content?: string | string[];
        imageData?: string;
        speakerNotes?: string;
      }>;
    };
    style?: string;
  };
  error_message?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

interface SubAgentResultCardProps {
  subAgent: SubAgentResult;
  onRevisionComplete?: (updatedSubAgent: SubAgentResult) => void;
  compact?: boolean;
}

export function SubAgentResultCard({ subAgent, onRevisionComplete, compact = false }: SubAgentResultCardProps) {
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [revisedVisualContent, setRevisedVisualContent] = useState<any>(null);

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'briefing':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'analysis':
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      case 'creative':
        return <ImageIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAgentLabel = (type: string) => {
    switch (type) {
      case 'calendar':
        return 'Calendar';
      case 'briefing':
        return 'Briefing';
      case 'analysis':
        return 'Analysis';
      case 'creative':
        return 'Creative';
      default:
        return type;
    }
  };

  const getStatusBadge = () => {
    switch (subAgent.status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Handle revising a slide image
  const handleReviseSlide = async (slideNumber: number) => {
    if (!subAgent.result_data?.visual_content) {
      toast.error('No visual content to revise');
      return;
    }

    if (!revisionRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsRevising(true);
    try {
      const visualContent = revisedVisualContent || subAgent.result_data.visual_content;

      const currentDeck = {
        title: visualContent.title || subAgent.task_data?.title || 'Creative Visuals',
        subtitle: visualContent.subtitle || '',
        slides: visualContent.slides,
      };

      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: {
          topic: subAgent.task_data?.title || 'Visual Content',
          targetAudience: 'general audience',
          style: subAgent.result_data.style || 'professional',
          includeImages: true,
          revisionRequest,
          currentDeck,
          slideNumber,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const updatedVisualContent = {
        title: data.title,
        subtitle: data.subtitle,
        totalSlides: data.slides?.length || data.totalSlides,
        slides: data.slides,
      };

      setRevisedVisualContent(updatedVisualContent);

      // Update the sub_agent in the database
      const updatedResultData = {
        ...subAgent.result_data,
        visual_content: updatedVisualContent,
      };

      await supabase
        .from('sub_agents')
        .update({ result_data: updatedResultData })
        .eq('id', subAgent.id);

      // Notify parent of update
      if (onRevisionComplete) {
        onRevisionComplete({
          ...subAgent,
          result_data: updatedResultData,
        });
      }

      setRevisionRequest('');
      setEditingSlideIndex(null);
      toast.success(`Slide ${slideNumber} revised successfully!`);
    } catch (error) {
      console.error('Slide revision error:', error);
      toast.error('Failed to revise slide. Please try again.');
    } finally {
      setIsRevising(false);
    }
  };

  // Render calendar results
  const renderCalendarResults = () => {
    const { result_data } = subAgent;
    if (!result_data) return null;

    return (
      <div className="space-y-3">
        {result_data.timeline_items_created !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span>{result_data.timeline_items_created} timeline item(s) created</span>
          </div>
        )}
        {result_data.events && result_data.events.length > 0 && (
          <div className="space-y-2">
            {result_data.events.map((event, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(event.start_time).toLocaleString()}
                  {event.end_time && ` - ${new Date(event.end_time).toLocaleString()}`}
                </p>
                {event.description && (
                  <p className="text-sm mt-2">{event.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {result_data.message && (
          <p className="text-sm text-muted-foreground">{result_data.message}</p>
        )}
      </div>
    );
  };

  // Render analysis/briefing results (markdown content)
  const renderContentResults = () => {
    const { result_data } = subAgent;
    if (!result_data?.content) return null;

    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {result_data.content}
        </ReactMarkdown>
      </div>
    );
  };

  // Render creative/visual results
  const renderVisualResults = () => {
    const visualContent = revisedVisualContent || subAgent.result_data?.visual_content;
    if (!visualContent?.slides || visualContent.slides.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {visualContent.title}
            {visualContent.subtitle && ` - ${visualContent.subtitle}`}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const slides = visualContent.slides;
              slides.forEach((slide: any, index: number) => {
                if (slide.imageData) {
                  const link = document.createElement('a');
                  link.href = `data:image/png;base64,${slide.imageData}`;
                  link.download = `slide-${index + 1}-${slide.title?.replace(/[^a-z0-9]/gi, '-') || 'visual'}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              });
              toast.success(`Downloaded ${slides.filter((s: any) => s.imageData).length} images`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>

        <div className="grid gap-4">
          {visualContent.slides.map((slide: any, index: number) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              {slide.imageData ? (
                <div className="relative group">
                  <img
                    src={`data:image/png;base64,${slide.imageData}`}
                    alt={slide.title || `Slide ${index + 1}`}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `data:image/png;base64,${slide.imageData}`;
                        link.download = `slide-${index + 1}-${slide.title?.replace(/[^a-z0-9]/gi, '-') || 'visual'}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success('Image downloaded');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingSlideIndex(index)}
                      disabled={isRevising}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Revise
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Image not available</p>
                </div>
              )}
              <div className="p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {slide.slideNumber || index + 1}. {slide.title || `Slide ${index + 1}`}
                    </p>
                    {slide.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {Array.isArray(slide.content) ? slide.content.join(' - ') : slide.content}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSlideIndex(editingSlideIndex === index ? null : index)}
                    disabled={isRevising}
                    className="ml-2 flex-shrink-0"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Revise
                  </Button>
                </div>

                {/* Inline Revision Input */}
                {editingSlideIndex === index && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <Textarea
                      placeholder="Describe what you want to change (e.g., 'Make colors warmer' or 'Add more detail')"
                      value={revisionRequest}
                      onChange={(e) => setRevisionRequest(e.target.value)}
                      rows={2}
                      className="text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!revisionRequest.trim()) {
                            toast.error('Please describe what you want to change');
                            return;
                          }
                          handleReviseSlide(slide.slideNumber || index + 1);
                        }}
                        disabled={isRevising || !revisionRequest.trim()}
                      >
                        {isRevising ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Revising...
                          </>
                        ) : (
                          'Apply Changes'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSlideIndex(null);
                          setRevisionRequest('');
                        }}
                        disabled={isRevising}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render error state
  if (subAgent.error_message) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {getAgentIcon(subAgent.agent_type)}
            <span>{subAgent.task_data?.title || `${getAgentLabel(subAgent.agent_type)} Task`}</span>
            <Badge variant="destructive">Failed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{subAgent.error_message}</p>
        </CardContent>
      </Card>
    );
  }

  // Render running/pending state
  if (subAgent.status === 'pending' || subAgent.status === 'running') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {getAgentIcon(subAgent.agent_type)}
            <span>{subAgent.task_data?.title || `${getAgentLabel(subAgent.agent_type)} Task`}</span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render completed results
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getAgentIcon(subAgent.agent_type)}
            <span>{subAgent.task_data?.title || `${getAgentLabel(subAgent.agent_type)} Task`}</span>
            {getStatusBadge()}
          </CardTitle>
          {subAgent.duration_ms && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(subAgent.duration_ms)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Render based on agent type */}
        {subAgent.agent_type === 'calendar' && renderCalendarResults()}
        {(subAgent.agent_type === 'briefing' || subAgent.agent_type === 'analysis') && renderContentResults()}
        {subAgent.agent_type === 'creative' && renderVisualResults()}

        {/* Generic message fallback */}
        {subAgent.result_data?.message && subAgent.agent_type !== 'calendar' && (
          <p className="text-sm text-muted-foreground mt-2">{subAgent.result_data.message}</p>
        )}

        {/* Show raw data toggle for debugging */}
        {!compact && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View raw data
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(subAgent.result_data, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Renders multiple sub-agent results in a list
 */
interface SubAgentResultsListProps {
  subAgents: SubAgentResult[];
  onRevisionComplete?: (updatedSubAgent: SubAgentResult) => void;
}

export function SubAgentResultsList({ subAgents, onRevisionComplete }: SubAgentResultsListProps) {
  if (subAgents.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      <p className="text-sm font-medium text-muted-foreground">
        Agent Results ({subAgents.length})
      </p>
      {subAgents.map((agent) => (
        <SubAgentResultCard
          key={agent.id}
          subAgent={agent}
          onRevisionComplete={onRevisionComplete}
        />
      ))}
    </div>
  );
}
