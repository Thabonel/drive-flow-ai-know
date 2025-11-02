import { useState } from 'react';
import { Brain, Calendar, FileText, Users, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { AILoadingAnimation } from '@/components/ai/AILoadingAnimation';

interface AISuggestion {
  id: string;
  type: 'delegate' | 'conflict' | 'optimize' | 'reschedule';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  executiveId?: string;
  timelineItemId?: string;
  suggestedAction?: string;
}

interface CommonTimeSlot {
  start: string;
  end: string;
  executives: string[];
  confidence: number;
}

export function AssistantAITools() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedExecutives, setSelectedExecutives] = useState<string[]>([]);
  const [commonTimeSlots, setCommonTimeSlots] = useState<CommonTimeSlot[]>([]);
  const [isFindingTime, setIsFindingTime] = useState(false);

  // Analyze schedule and generate AI suggestions
  const analyzeSchedule = async () => {
    if (!user) return;

    setIsAnalyzing(true);
    try {
      // Get all executives' timeline items
      const { data: relationships } = await supabase
        .from('assistant_relationships')
        .select('executive_id')
        .eq('assistant_id', user.id)
        .eq('status', 'active');

      if (!relationships || relationships.length === 0) {
        toast({
          title: 'No Executives',
          description: 'You are not assigned to any executives',
          variant: 'destructive',
        });
        return;
      }

      const executiveIds = relationships.map(r => r.executive_id);

      // Get upcoming timeline items for all executives
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { data: timelineItems } = await supabase
        .from('timeline_items')
        .select('*')
        .in('user_id', executiveIds)
        .gte('start_time', now)
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      // Run AI analysis (simplified - in production, call AI endpoint)
      const aiSuggestions: AISuggestion[] = [];

      // Detect meetings that could be delegated
      timelineItems?.forEach(item => {
        if (item.title.toLowerCase().includes('routine') ||
            item.title.toLowerCase().includes('status update') ||
            item.title.toLowerCase().includes('weekly sync')) {
          aiSuggestions.push({
            id: `delegate-${item.id}`,
            type: 'delegate',
            title: 'Consider Delegating',
            description: `"${item.title}" appears to be a routine meeting that could potentially be delegated to a team member.`,
            confidence: 0.75,
            impact: 'medium',
            executiveId: item.user_id,
            timelineItemId: item.id,
            suggestedAction: 'Delegate to senior team member'
          });
        }
      });

      // Detect double-bookings
      for (let i = 0; i < (timelineItems?.length || 0); i++) {
        for (let j = i + 1; j < (timelineItems?.length || 0); j++) {
          const item1 = timelineItems![i];
          const item2 = timelineItems![j];

          const start1 = new Date(item1.start_time);
          const end1 = new Date(item1.end_time);
          const start2 = new Date(item2.start_time);
          const end2 = new Date(item2.end_time);

          // Check if times overlap
          if (start1 < end2 && start2 < end1) {
            aiSuggestions.push({
              id: `conflict-${item1.id}-${item2.id}`,
              type: 'conflict',
              title: 'Double-Booking Detected',
              description: `"${item1.title}" and "${item2.title}" overlap. ${item1.user_id === item2.user_id ? 'Same executive' : 'Different executives'} affected.`,
              confidence: 1.0,
              impact: 'high',
              executiveId: item1.user_id,
              suggestedAction: 'Reschedule one of the meetings'
            });
          }
        }
      }

      // Detect optimization opportunities
      timelineItems?.forEach((item, index) => {
        if (index < (timelineItems.length - 1)) {
          const nextItem = timelineItems[index + 1];
          if (item.user_id === nextItem.user_id) {
            const end = new Date(item.end_time);
            const nextStart = new Date(nextItem.start_time);
            const gapMinutes = (nextStart.getTime() - end.getTime()) / 1000 / 60;

            if (gapMinutes < 15 && gapMinutes > 0) {
              aiSuggestions.push({
                id: `optimize-${item.id}`,
                type: 'optimize',
                title: 'Back-to-Back Meetings',
                description: `Only ${Math.round(gapMinutes)} minutes between "${item.title}" and "${nextItem.title}". Consider adding buffer time.`,
                confidence: 0.85,
                impact: 'medium',
                executiveId: item.user_id,
                suggestedAction: 'Add 15-minute break'
              });
            }
          }
        }
      });

      setSuggestions(aiSuggestions);

      toast({
        title: 'Analysis Complete',
        description: `Found ${aiSuggestions.length} AI suggestions`,
      });
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze schedules',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate briefs for all today's meetings
  const generateAllBriefs = async () => {
    if (!user) return;

    try {
      toast({
        title: 'Generating Briefs',
        description: 'AI is creating meeting briefs...',
      });

      // Get today's meetings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: relationships } = await supabase
        .from('assistant_relationships')
        .select('executive_id')
        .eq('assistant_id', user.id)
        .eq('status', 'active');

      if (!relationships) return;

      const executiveIds = relationships.map(r => r.executive_id);

      const { data: meetings } = await supabase
        .from('timeline_items')
        .select('*')
        .in('user_id', executiveIds)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time');

      if (!meetings || meetings.length === 0) {
        toast({
          title: 'No Meetings',
          description: 'No meetings scheduled for today',
        });
        return;
      }

      // Create briefings for each meeting
      for (const meeting of meetings) {
        await supabase.from('meeting_briefings').insert({
          meeting_id: meeting.id,
          executive_id: meeting.user_id,
          prepared_by_user_id: user.id,
          briefing_title: `Brief: ${meeting.title}`,
          executive_summary: `AI-generated briefing for ${meeting.title}`,
          key_points: [
            { point: 'Review agenda', priority: 'high' },
            { point: 'Prepare questions', priority: 'medium' },
            { point: 'Follow up on action items', priority: 'medium' }
          ],
        });
      }

      toast({
        title: 'Briefs Created',
        description: `Generated ${meetings.length} meeting briefs`,
      });
    } catch (error) {
      console.error('Error generating briefs:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate briefs',
        variant: 'destructive',
      });
    }
  };

  // Find common time across multiple executives
  const findCommonTime = async () => {
    if (selectedExecutives.length < 2) {
      toast({
        title: 'Select Executives',
        description: 'Please select at least 2 executives to find common time',
        variant: 'destructive',
      });
      return;
    }

    setIsFindingTime(true);
    try {
      // Get all busy times for selected executives
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { data: busyTimes } = await supabase
        .from('timeline_items')
        .select('*')
        .in('user_id', selectedExecutives)
        .gte('start_time', today.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      // Find gaps (simplified algorithm)
      const slots: CommonTimeSlot[] = [];
      const workStart = 9; // 9 AM
      const workEnd = 17; // 5 PM

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + day);

        for (let hour = workStart; hour < workEnd; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1);

          // Check if all executives are free
          const isFree = selectedExecutives.every(execId => {
            return !busyTimes?.some(item => {
              if (item.user_id !== execId) return false;
              const itemStart = new Date(item.start_time);
              const itemEnd = new Date(item.end_time);
              return itemStart < slotEnd && itemEnd > slotStart;
            });
          });

          if (isFree) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              executives: selectedExecutives,
              confidence: 1.0
            });
          }
        }
      }

      setCommonTimeSlots(slots.slice(0, 10)); // Show top 10 slots

      toast({
        title: 'Time Slots Found',
        description: `Found ${slots.length} available time slots`,
      });
    } catch (error) {
      console.error('Error finding common time:', error);
      toast({
        title: 'Error',
        description: 'Failed to find common time',
        variant: 'destructive',
      });
    } finally {
      setIsFindingTime(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delegate':
        return Users;
      case 'conflict':
        return AlertCircle;
      case 'optimize':
        return Zap;
      case 'reschedule':
        return Calendar;
      default:
        return Brain;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Assistant Tools
          </CardTitle>
          <CardDescription>
            Intelligent scheduling assistance powered by AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={analyzeSchedule}
              disabled={isAnalyzing}
              className="justify-start"
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze All Schedules
                </>
              )}
            </Button>

            <Button
              onClick={generateAllBriefs}
              className="justify-start"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Today's Briefs
            </Button>

            <Button
              onClick={findCommonTime}
              disabled={isFindingTime}
              className="justify-start"
              variant="outline"
            >
              {isFindingTime ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Find Common Time
                </>
              )}
            </Button>

            <Button
              className="justify-start"
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Optimize Schedules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions ({suggestions.length})</CardTitle>
            <CardDescription>
              Actionable insights from schedule analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const Icon = getTypeIcon(suggestion.type);
                return (
                  <Alert key={suggestion.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('h-2 w-2 rounded-full mt-2', getImpactColor(suggestion.impact))} />
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% confident
                          </Badge>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {suggestion.description}
                        </AlertDescription>
                        {suggestion.suggestedAction && (
                          <p className="text-xs text-muted-foreground italic">
                            Suggestion: {suggestion.suggestedAction}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">View Details</Button>
                          <Button size="sm">Take Action</Button>
                        </div>
                      </div>
                    </div>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Time Slots */}
      {commonTimeSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Time Slots</CardTitle>
            <CardDescription>
              Common availability for {selectedExecutives.length} executives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commonTimeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(slot.start).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(slot.start).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(slot.end).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Book Meeting</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isAnalyzing && suggestions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <AILoadingAnimation
              message="AI is analyzing schedules across all executives..."
              variant="brain"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
