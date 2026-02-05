// Simple Timeline Manager - OpenClaw Controlled
// Clean interface with intelligent assistance behind the scenes
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { TimelineCanvas } from './TimelineCanvas';
import { CalendarGrid } from './CalendarGrid';
import {
  getTimelineIntelligenceEngine,
  getTimelineInsights,
  type TimelineAnalysis
} from '@/integrations/openclaw/timeline-intelligence';
import {
  extractTimelineFromText,
  useOpenClawAuth,
  type TimelineEvent,
  type TimelineExtractionResponse
} from '@/integrations/openclaw';
import { useTimeline } from '@/hooks/useTimeline';

// Simple view modes
type ViewMode = 'timeline' | 'calendar';

// Proactive suggestion from OpenClaw
interface ProactiveSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  action: () => Promise<void>;
}

const SimpleTimelineManager: React.FC = () => {
  // Core state - kept minimal
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [smartInput, setSmartInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSmartInput, setShowSmartInput] = useState(false);

  // OpenClaw intelligence state
  const [timelineInsights, setTimelineInsights] = useState<TimelineAnalysis | null>(null);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [intelligenceStatus, setIntelligenceStatus] = useState<'starting' | 'active' | 'error'>('starting');

  // Hooks
  const { toast } = useToast();
  const { authState } = useOpenClawAuth();
  const { items: timelineItems, addItem, updateItem, deleteItem, refreshItems } = useTimeline();

  // Refs
  const intelligenceEngine = useRef(getTimelineIntelligenceEngine());

  // Initialize OpenClaw intelligence
  useEffect(() => {
    initializeIntelligence();

    // Refresh insights periodically
    const insightsInterval = setInterval(async () => {
      await refreshInsights();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(insightsInterval);
    };
  }, []);

  // Initialize OpenClaw timeline intelligence
  const initializeIntelligence = async () => {
    try {
      console.log('🧠 Initializing OpenClaw Timeline Intelligence...');

      // Get initial insights
      const insights = await getTimelineInsights();
      setTimelineInsights(insights);

      // Load proactive suggestions
      await loadProactiveSuggestions();

      setIntelligenceStatus('active');

      if (insights) {
        toast({
          title: "🤖 AI Assistant Active",
          description: `Timeline analyzed. Health: ${insights.insights.overallHealth}`,
        });
      }

    } catch (error) {
      console.error('Failed to initialize intelligence:', error);
      setIntelligenceStatus('error');
    }
  };

  // Refresh timeline insights from OpenClaw
  const refreshInsights = async () => {
    if (intelligenceStatus !== 'active') return;

    try {
      const insights = await getTimelineInsights();
      setTimelineInsights(insights);
      await loadProactiveSuggestions();
    } catch (error) {
      console.error('Failed to refresh insights:', error);
    }
  };

  // Load proactive suggestions from OpenClaw
  const loadProactiveSuggestions = async () => {
    // Get recent proactive actions that need user attention
    const engine = intelligenceEngine.current;
    const recentActions = engine.getRecentActions(5);

    // Convert to suggestions format
    const suggestions: ProactiveSuggestion[] = [];

    if (timelineInsights?.proactiveActions) {
      timelineInsights.proactiveActions
        .filter(action => !action.autoExecute && action.confidence > 0.6)
        .forEach((action, index) => {
          suggestions.push({
            id: `suggestion_${index}`,
            type: action.type,
            title: getActionTitle(action.type),
            description: action.description,
            confidence: action.confidence,
            action: async () => {
              await executeProactiveSuggestion(action);
            }
          });
        });
    }

    setProactiveSuggestions(suggestions);
  };

  // Get user-friendly title for action type
  const getActionTitle = (actionType: string): string => {
    const titles: Record<string, string> = {
      'add_buffer': '⏰ Add Buffer Time',
      'resolve_conflict': '🔄 Resolve Conflict',
      'create_focus_block': '🎯 Create Focus Block',
      'optimize_order': '📋 Optimize Schedule',
      'suggest_reschedule': '📅 Reschedule Suggestion'
    };
    return titles[actionType] || '💡 Smart Suggestion';
  };

  // Execute a proactive suggestion
  const executeProactiveSuggestion = async (action: any) => {
    setIsProcessing(true);

    try {
      // Apply the suggested changes
      if (action.proposedChanges?.length) {
        for (const change of action.proposedChanges) {
          if (change.id) {
            // Update existing item
            await updateItem(change.id, {
              title: change.title,
              description: change.description,
              start_time: change.startTime.toISOString(),
              end_time: change.endTime?.toISOString(),
              duration_minutes: change.duration
            });
          } else {
            // Add new item
            await addItem({
              title: change.title,
              description: change.description,
              start_time: change.startTime.toISOString(),
              end_time: change.endTime?.toISOString(),
              duration_minutes: change.duration,
              type: change.type || 'task',
              priority: change.priority || 'medium'
            });
          }
        }
      }

      // Remove suggestion after execution
      setProactiveSuggestions(prev =>
        prev.filter(s => s.description !== action.description)
      );

      toast({
        title: "✅ Applied AI Suggestion",
        description: action.description,
      });

      // Refresh timeline
      await refreshItems();

    } catch (error) {
      console.error('Failed to execute suggestion:', error);
      toast({
        title: "❌ Failed to Apply Suggestion",
        description: "Please try again or apply changes manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle smart input - OpenClaw parses and creates timeline events
  const handleSmartInput = async () => {
    if (!smartInput.trim()) return;

    setIsProcessing(true);

    try {
      console.log('🤖 OpenClaw processing smart input:', smartInput);

      // Use OpenClaw to extract timeline events
      const result = await extractTimelineFromText(smartInput, {
        learningEnabled: true,
        contextHints: {
          projectType: 'general',
          urgency: 'medium',
          estimationStyle: 'realistic'
        }
      });

      console.log('✅ OpenClaw extraction result:', result);

      // Add extracted events to timeline
      let addedCount = 0;
      for (const event of result.events) {
        try {
          await addItem({
            title: event.title,
            description: event.description || '',
            start_time: event.startTime.toISOString(),
            end_time: event.endTime?.toISOString(),
            duration_minutes: event.duration,
            type: event.type || 'task',
            priority: event.priority || 'medium',
            tags: event.tags || [],
            metadata: {
              extractedByOpenClaw: true,
              confidence: result.confidence,
              ...event.metadata
            }
          });
          addedCount++;
        } catch (error) {
          console.error('Failed to add extracted event:', error);
        }
      }

      // Clear input and hide form
      setSmartInput('');
      setShowSmartInput(false);

      // Show success message
      toast({
        title: `🤖 AI Extracted ${addedCount} Events`,
        description: `Confidence: ${Math.round(result.confidence * 100)}%${result.suggestions?.optimizations?.length ? ' • Suggestions available' : ''}`,
      });

      // Refresh timeline and insights
      await refreshItems();
      await refreshInsights();

    } catch (error) {
      console.error('Smart input processing failed:', error);
      toast({
        title: "❌ AI Processing Failed",
        description: "Unable to extract timeline events. Please try a different format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick add single event
  const handleQuickAdd = async (title: string) => {
    if (!title.trim()) return;

    try {
      // Let OpenClaw suggest timing and details
      const suggestion = await extractTimelineFromText(title, {
        learningEnabled: true,
        contextHints: {
          projectType: 'quick_add',
          urgency: 'medium',
          estimationStyle: 'realistic'
        }
      });

      const event = suggestion.events[0];
      if (event) {
        await addItem({
          title: event.title,
          description: event.description || '',
          start_time: event.startTime.toISOString(),
          end_time: event.endTime?.toISOString(),
          duration_minutes: event.duration,
          type: event.type || 'task',
          priority: event.priority || 'medium'
        });

        await refreshItems();
      } else {
        // Fallback to simple addition
        const now = new Date();
        const startTime = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now

        await addItem({
          title,
          start_time: startTime.toISOString(),
          duration_minutes: 60,
          type: 'task',
          priority: 'medium'
        });

        await refreshItems();
      }

      toast({
        title: "✅ Event Added",
        description: `"${title}" added to timeline`,
      });

    } catch (error) {
      console.error('Quick add failed:', error);
      toast({
        title: "❌ Failed to Add Event",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Get timeline health color
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'needs_attention': return 'bg-yellow-500';
      case 'problematic': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Simple and Clean */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Timeline</h1>

              {/* Intelligence Status Indicator */}
              {intelligenceStatus === 'active' && timelineInsights && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(timelineInsights.insights.overallHealth)}`}></div>
                  <span className="text-sm text-muted-foreground">
                    AI Assistant: {timelineInsights.insights.overallHealth}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'timeline' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                >
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  Calendar
                </Button>
              </div>

              {/* Smart Add Button */}
              <Button
                onClick={() => setShowSmartInput(!showSmartInput)}
                className="bg-accent hover:bg-accent/90"
              >
                🤖 Smart Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">

        {/* Proactive Suggestions - Only show if OpenClaw has suggestions */}
        {proactiveSuggestions.length > 0 && (
          <Card className="p-4 border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">🤖 AI Suggestions</span>
              <Badge variant="outline" className="text-xs">
                {proactiveSuggestions.length} available
              </Badge>
            </div>
            <div className="space-y-2">
              {proactiveSuggestions.slice(0, 2).map((suggestion) => (
                <div key={suggestion.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                    <Button
                      size="sm"
                      onClick={suggestion.action}
                      disabled={isProcessing}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Smart Input - OpenClaw Powered */}
        {showSmartInput && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">🤖 Smart Input</span>
                <Badge variant="outline" className="text-xs">OpenClaw Powered</Badge>
              </div>
              <Textarea
                placeholder="Describe your schedule or paste AI-generated plans...

Examples:
• Team standup every Monday 9am for 30 minutes
• Client presentation Friday 3pm, prepare slides beforehand
• Code review Tuesday 2-3pm
• Sprint planning Wednesday 10am-12pm"
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowSmartInput(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSmartInput}
                  disabled={!smartInput.trim() || isProcessing}
                >
                  {isProcessing ? 'Processing...' : '🤖 Extract Timeline'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Timeline/Calendar View */}
        <div className="bg-card rounded-lg border">
          {viewMode === 'timeline' ? (
            <div className="p-4">
              <TimelineCanvas />
            </div>
          ) : (
            <div className="p-4">
              <CalendarGrid />
            </div>
          )}
        </div>

        {/* Timeline Insights - Minimal, appears only when relevant */}
        {timelineInsights && (
          timelineInsights.insights.overallHealth === 'needs_attention' ||
          timelineInsights.insights.overallHealth === 'problematic'
        ) && (
          <Card className="p-4 border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">⚠️ Timeline Health</span>
              <Badge variant="outline">{timelineInsights.insights.overallHealth}</Badge>
            </div>
            {timelineInsights.insights.learningRecommendations.slice(0, 2).map((rec, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                • {rec}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Quick Add - Floating */}
      <div className="fixed bottom-6 right-6">
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Quick add: 'Team meeting tomorrow 2pm'"
            className="w-80"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuickAdd(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleTimelineManager;