import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  TrendingUp,
  Users,
  MapPin,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Send,
  Loader2
} from 'lucide-react';
import { useAIDailyBrief } from '@/hooks/useAIDailyBrief';
import { format } from 'date-fns';

interface AIDailyBriefProps {
  date?: Date;
  autoGenerate?: boolean;
}

export function AIDailyBrief({ date = new Date(), autoGenerate = true }: AIDailyBriefProps) {
  const {
    brief,
    loading,
    error,
    generateBrief,
    sendBriefEmail,
    emailSending
  } = useAIDailyBrief(date);

  const [showFullInsights, setShowFullInsights] = useState(false);

  useEffect(() => {
    // Only auto-generate once on mount if enabled, and don't retry on error
    if (autoGenerate && !brief && !loading && !error) {
      generateBrief();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, brief, loading, error]); // Removed generateBrief to prevent infinite loop

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Generating your daily brief...</p>
        <p className="text-sm text-muted-foreground">Analyzing your schedule, tasks, and priorities</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to generate brief: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!brief) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Sparkles className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Ready to generate your daily brief?</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Get AI-powered insights about your day, including priority meetings, key decisions, and personalized suggestions.
        </p>
        <Button onClick={generateBrief} size="lg">
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Daily Brief
        </Button>
      </div>
    );
  }

  const priorityMeetings = brief.priority_meetings || [];
  const keyDecisions = brief.key_decisions || [];
  const tasksDueToday = brief.tasks_due_today || [];
  const scheduleOverview = brief.schedule_overview || [];
  const aiSuggestions = brief.ai_suggestions || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Daily Brief
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateBrief}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={sendBriefEmail} disabled={emailSending}>
            {emailSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Email Brief
          </Button>
        </div>
      </div>

      {/* AI Insights Summary */}
      {brief.ai_insights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {showFullInsights ? (
                <p className="whitespace-pre-wrap">{brief.ai_insights}</p>
              ) : (
                <p className="line-clamp-3">{brief.ai_insights}</p>
              )}
            </div>
            {brief.ai_insights.length > 200 && (
              <Button
                variant="link"
                className="mt-2 p-0"
                onClick={() => setShowFullInsights(!showFullInsights)}
              >
                {showFullInsights ? 'Show less' : 'Read more'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Priority Meetings
              <Badge variant="secondary">{priorityMeetings.length}</Badge>
            </CardTitle>
            <CardDescription>
              Important meetings requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {priorityMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No priority meetings today</p>
            ) : (
              <div className="space-y-3">
                {priorityMeetings.map((meeting: any) => (
                  <div key={meeting.id} className="space-y-1 p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{meeting.title}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(meeting.start_time), 'h:mm a')} - {format(new Date(meeting.end_time), 'h:mm a')}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {meeting.location}
                            </span>
                          )}
                        </div>
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">With: </span>
                            {meeting.attendees.slice(0, 3).join(', ')}
                            {meeting.attendees.length > 3 && ` +${meeting.attendees.length - 3} more`}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {meeting.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Due Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Tasks Due Today
              <Badge variant="secondary">{tasksDueToday.length}</Badge>
            </CardTitle>
            <CardDescription>
              Tasks that need to be completed today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasksDueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks due today</p>
            ) : (
              <div className="space-y-2">
                {tasksDueToday.map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        {task.priority && (
                          <Badge
                            variant={task.priority === '1' ? 'destructive' : task.priority === '2' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            P{task.priority}
                          </Badge>
                        )}
                        {task.estimated_duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimated_duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Decisions Needed */}
      {keyDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Key Decisions Needed
              <Badge variant="secondary">{keyDecisions.length}</Badge>
            </CardTitle>
            <CardDescription>
              Important decisions requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {keyDecisions.map((decision: any, index: number) => (
                <div key={index} className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold">{decision.title}</h4>
                  {decision.description && (
                    <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
                  )}
                  {decision.deadline && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Due: {format(new Date(decision.deadline), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Schedule Overview
            <Badge variant="secondary">{scheduleOverview.length} items</Badge>
          </CardTitle>
          <CardDescription>
            Your complete schedule for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduleOverview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled items today</p>
          ) : (
            <div className="space-y-2">
              {scheduleOverview.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded border bg-card">
                  <div className="text-xs font-mono text-muted-foreground w-20">
                    {format(new Date(item.start_time), 'h:mm a')}
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      {item.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Suggestions
            </CardTitle>
            <CardDescription>
              Personalized recommendations to optimize your day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    {suggestion.action && (
                      <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                        {suggestion.action}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>Brief generated at {format(new Date(brief.generated_at), 'h:mm a')}</p>
      </div>
    </div>
  );
}
