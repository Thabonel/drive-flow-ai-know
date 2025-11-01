import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Target, MessageSquare, HelpCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { callOpenAI } from '@/lib/ai/openai-client';
import {
  generateMeetingPrepPrompt,
  parseMeetingPrepResponse,
  type MeetingContext,
  type MeetingPrep,
} from '@/lib/ai/prompts/meeting-prep';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AIMeetingPrepProps {
  meeting: {
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    duration_minutes?: number;
    attendees?: string[];
    meeting_type?: 'internal' | 'external' | 'client' | '1-on-1' | 'team' | 'other';
  };
  onPrepGenerated?: (prep: MeetingPrep) => void;
}

export function AIMeetingPrep({ meeting, onPrepGenerated }: AIMeetingPrepProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<MeetingPrep | null>(null);
  const { toast } = useToast();

  const handleGeneratePrep = async () => {
    setLoading(true);

    try {
      const context: MeetingContext = {
        title: meeting.title,
        description: meeting.description,
        attendees: meeting.attendees,
        duration_minutes: meeting.duration_minutes,
        start_time: meeting.start_time,
        meeting_type: meeting.meeting_type,
      };

      const prompt = generateMeetingPrepPrompt(context);
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 1000,
      });

      const parsedPrep = parseMeetingPrepResponse(response);
      setPrep(parsedPrep);
      onPrepGenerated?.(parsedPrep);

      toast({
        title: 'Meeting prep generated!',
        description: `AI has prepared your meeting brief with ${parsedPrep.confidence >= 0.7 ? 'high' : 'medium'} confidence.`,
      });
    } catch (error) {
      console.error('Failed to generate meeting prep:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not generate meeting prep. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">High Confidence</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    } else {
      return <Badge className="bg-orange-500">Low Confidence</Badge>;
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          if (!prep) handleGeneratePrep();
        }}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Sparkles className="h-3 w-3" />
        AI Prep
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Meeting Preparation Brief
            </DialogTitle>
            <DialogDescription>{meeting.title}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                <p className="text-sm text-muted-foreground">Generating your meeting brief...</p>
              </div>
            </div>
          ) : prep ? (
            <div className="space-y-6">
              {/* Confidence Badge */}
              <div className="flex items-center justify-between">
                {getConfidenceBadge(prep.confidence)}
                <Button
                  onClick={handleGeneratePrep}
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  className="gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {/* Meeting Objectives */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Meeting Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prep.objectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Key Talking Points */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    Key Talking Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prep.talking_points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Questions to Prepare */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-orange-600" />
                    Questions to Prepare
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prep.questions_to_ask.map((question, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-orange-600 font-medium flex-shrink-0">Q{idx + 1}:</span>
                        <span className="text-sm">{question}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Potential Decisions */}
              {prep.potential_decisions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-red-600" />
                      Potential Decisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prep.potential_decisions.map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-sm">• {decision}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Preparation Items */}
              {prep.preparation_items.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Before the Meeting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prep.preparation_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="w-4 h-4 border-2 border-indigo-600 rounded mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Suggested Duration */}
              {prep.suggested_duration && !meeting.duration_minutes && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Suggested Duration:</span>
                      <span className="text-sm">{prep.suggested_duration} minutes</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Click "AI Prep" to generate your meeting brief</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
