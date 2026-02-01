import React, { useState, useCallback } from 'react';
import { useSupabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Play,
  Upload,
  MessageSquare
} from 'lucide-react';

interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: number;
  attention_type: string;
  context: string;
}

interface FollowUpEvent {
  title: string;
  description: string;
  suggested_date: string;
  duration_minutes: number;
  attention_type: string;
  attendees: string[];
  priority: number;
}

interface MeetingAnalysisResult {
  meeting_summary: string;
  key_decisions: string[];
  action_items: ActionItem[];
  follow_up_events: FollowUpEvent[];
  next_steps: string[];
  risks_identified: string[];
  team_assignments: {
    team_member: string;
    tasks: string[];
    estimated_workload: number;
  }[];
  scheduling_recommendations: {
    urgent_items: ActionItem[];
    this_week: ActionItem[];
    next_week: ActionItem[];
    backlog: ActionItem[];
  };
}

interface MeetingIntelligenceProps {
  onScheduleItems: (items: ActionItem[]) => void;
  onCreateFollowUpEvents: (events: FollowUpEvent[]) => void;
}

const MeetingIntelligence: React.FC<MeetingIntelligenceProps> = ({
  onScheduleItems,
  onCreateFollowUpEvents
}) => {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MeetingAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendees, setAttendees] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [selectedActionItems, setSelectedActionItems] = useState<Set<string>>(new Set());

  const processMeeting = useCallback(async (processingType: 'action_items' | 'summary' | 'follow_up_scheduling' | 'full_analysis') => {
    if (!user) return;

    if (!meetingTitle.trim()) {
      setError('Meeting title is required');
      return;
    }

    if (!meetingNotes.trim() && !meetingTranscript.trim()) {
      setError('Please provide either meeting notes or transcript');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-meeting-processor', {
        body: {
          meeting_title: meetingTitle,
          meeting_date: meetingDate,
          attendees: attendees.split(',').map(a => a.trim()).filter(Boolean),
          meeting_notes: meetingNotes || undefined,
          meeting_transcript: meetingTranscript || undefined,
          processing_type: processingType
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process meeting');
      }

      if (processingType === 'full_analysis') {
        setAnalysisResult(data.analysis_result);
        // Pre-select all action items
        setSelectedActionItems(new Set(
          data.analysis_result.action_items?.map((item: ActionItem) => item.id) || []
        ));
      } else {
        // For partial analysis, merge with existing results
        setAnalysisResult(prev => ({
          ...prev,
          ...data.analysis_result
        } as MeetingAnalysisResult));
      }

      console.log('Meeting processed successfully:', processingType);

    } catch (error) {
      console.error('Meeting processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process meeting');
    } finally {
      setIsProcessing(false);
    }
  }, [user, meetingTitle, meetingDate, attendees, meetingNotes, meetingTranscript, supabase]);

  const handleScheduleSelectedItems = useCallback(() => {
    if (!analysisResult) return;

    const selectedItems = analysisResult.action_items?.filter(item =>
      selectedActionItems.has(item.id)
    ) || [];

    onScheduleItems(selectedItems);
  }, [analysisResult, selectedActionItems, onScheduleItems]);

  const toggleActionItemSelection = useCallback((itemId: string) => {
    setSelectedActionItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Meeting Input Form */}
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Meeting Intelligence Pipeline
          </CardTitle>
          <CardDescription>
            Transform meeting notes or transcripts into actionable timeline items and follow-up events.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Meeting Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting-title">Meeting Title</Label>
                <Input
                  id="meeting-title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Weekly team standup"
                  className="shadow-neu-pressed rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="meeting-date">Meeting Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="shadow-neu-pressed rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="attendees">Attendees (comma-separated emails)</Label>
              <Input
                id="attendees"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="john@company.com, sarah@company.com"
                className="shadow-neu-pressed rounded-xl"
              />
            </div>

            {/* Content Input */}
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notes">Meeting Notes</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="space-y-2">
                <Label htmlFor="meeting-notes">Meeting Notes</Label>
                <Textarea
                  id="meeting-notes"
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Paste your meeting notes here..."
                  className="min-h-32 shadow-neu-pressed rounded-xl"
                />
              </TabsContent>

              <TabsContent value="transcript" className="space-y-2">
                <Label htmlFor="meeting-transcript">Meeting Transcript</Label>
                <Textarea
                  id="meeting-transcript"
                  value={meetingTranscript}
                  onChange={(e) => setMeetingTranscript(e.target.value)}
                  placeholder="Paste meeting transcript here..."
                  className="min-h-32 shadow-neu-pressed rounded-xl"
                />
              </TabsContent>
            </Tabs>

            {error && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Processing Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => processMeeting('action_items')}
                disabled={isProcessing}
                variant="outline"
                className="h-16 flex flex-col items-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Action Items</span>
              </Button>

              <Button
                onClick={() => processMeeting('summary')}
                disabled={isProcessing}
                variant="outline"
                className="h-16 flex flex-col items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Summary</span>
              </Button>

              <Button
                onClick={() => processMeeting('follow_up_scheduling')}
                disabled={isProcessing}
                variant="outline"
                className="h-16 flex flex-col items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Follow-ups</span>
              </Button>

              <Button
                onClick={() => processMeeting('full_analysis')}
                disabled={isProcessing}
                className="h-16 flex flex-col items-center gap-1 bg-gradient-primary hover:opacity-90 text-white"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="text-xs">Full Analysis</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Meeting Summary */}
          {analysisResult.meeting_summary && (
            <Card className="shadow-neu-raised rounded-2xl">
              <CardHeader>
                <CardTitle>Meeting Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{analysisResult.meeting_summary}</p>

                {analysisResult.key_decisions && analysisResult.key_decisions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Key Decisions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.key_decisions.map((decision, index) => (
                        <li key={index}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {analysisResult.action_items && analysisResult.action_items.length > 0 && (
            <Card className="shadow-neu-raised rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Action Items ({analysisResult.action_items.length})</span>
                  <Button
                    onClick={handleScheduleSelectedItems}
                    disabled={selectedActionItems.size === 0}
                    className="bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Schedule Selected ({selectedActionItems.size})
                  </Button>
                </CardTitle>
                <CardDescription>
                  AI extracted these action items from your meeting. Select items to auto-schedule them.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {analysisResult.action_items.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                        selectedActionItems.has(item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleActionItemSelection(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedActionItems.has(item.id)}
                          onChange={() => toggleActionItemSelection(item.id)}
                          className="mt-1 accent-primary"
                        />

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium">{item.text}</div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={getPriorityColor(item.priority)}
                              >
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(item.estimated_duration)}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Assignee:</span> {item.assignee}
                            </div>
                            {item.due_date && (
                              <div>
                                <span className="font-medium">Due:</span> {formatDate(item.due_date)}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Type:</span> {item.attention_type}
                            </div>
                          </div>

                          {item.context && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {item.context}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scheduling Recommendations */}
                {analysisResult.scheduling_recommendations && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Scheduling Recommendations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-red-50 rounded-xl">
                        <div className="text-sm font-medium text-red-800">Urgent</div>
                        <div className="text-lg font-bold text-red-600">
                          {analysisResult.scheduling_recommendations.urgent_items?.length || 0}
                        </div>
                      </div>

                      <div className="p-3 bg-orange-50 rounded-xl">
                        <div className="text-sm font-medium text-orange-800">This Week</div>
                        <div className="text-lg font-bold text-orange-600">
                          {analysisResult.scheduling_recommendations.this_week?.length || 0}
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="text-sm font-medium text-blue-800">Next Week</div>
                        <div className="text-lg font-bold text-blue-600">
                          {analysisResult.scheduling_recommendations.next_week?.length || 0}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-sm font-medium text-gray-800">Backlog</div>
                        <div className="text-lg font-bold text-gray-600">
                          {analysisResult.scheduling_recommendations.backlog?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-up Events */}
          {analysisResult.follow_up_events && analysisResult.follow_up_events.length > 0 && (
            <Card className="shadow-neu-raised rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Suggested Follow-up Events</span>
                  <Button
                    onClick={() => onCreateFollowUpEvents(analysisResult.follow_up_events)}
                    className="bg-gradient-primary hover:opacity-90 text-white"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule All
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {analysisResult.follow_up_events.map((event, index) => (
                    <div key={index} className="p-4 border rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {event.description}
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(event.duration_minutes)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(event.suggested_date)}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {event.attention_type}
                        </div>
                        <div>
                          <span className="font-medium">Priority:</span> {event.priority}/5
                        </div>
                      </div>

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {event.attendees.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Assignments */}
          {analysisResult.team_assignments && analysisResult.team_assignments.length > 0 && (
            <Card className="shadow-neu-raised rounded-2xl">
              <CardHeader>
                <CardTitle>Team Workload Distribution</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {analysisResult.team_assignments.map((assignment, index) => (
                    <div key={index} className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{assignment.team_member}</div>
                        <Badge variant="outline">
                          {assignment.estimated_workload}h workload
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Tasks:</span> {assignment.tasks.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Insights */}
          {(analysisResult.next_steps?.length > 0 || analysisResult.risks_identified?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Next Steps */}
              {analysisResult.next_steps && analysisResult.next_steps.length > 0 && (
                <Card className="shadow-neu-raised rounded-2xl">
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.next_steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Risks Identified */}
              {analysisResult.risks_identified && analysisResult.risks_identified.length > 0 && (
                <Card className="shadow-neu-raised rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Risks Identified
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.risks_identified.map((risk, index) => (
                        <li key={index} className="text-orange-700">{risk}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingIntelligence;