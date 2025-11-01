import { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, EyeOff, Clock, CheckCircle2, Edit, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MeetingBriefing {
  id: string;
  meeting_id: string;
  executive_id: string;
  prepared_by_user_id: string;
  briefing_title: string;
  executive_summary: string | null;
  key_points: any[];
  attendees_info: any[];
  background_context: string | null;
  talking_points: any[];
  decisions_needed: any[];
  document_ids: string[];
  is_distributed: boolean;
  distributed_at: string | null;
  is_read: boolean;
  read_at: string | null;
  version: number;
  created_at: string;
  meeting?: {
    title: string;
    start_time: string;
    end_time: string;
  };
}

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

interface BriefingFormData {
  meeting_id: string;
  executive_id: string;
  briefing_title: string;
  executive_summary: string;
  key_points: Array<{ point: string; priority: string }>;
  talking_points: Array<{ topic: string; notes: string }>;
  decisions_needed: Array<{ decision: string; context: string }>;
  background_context: string;
}

export function MeetingBriefingManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [briefings, setBriefings] = useState<MeetingBriefing[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BriefingFormData>({
    meeting_id: '',
    executive_id: '',
    briefing_title: '',
    executive_summary: '',
    key_points: [{ point: '', priority: 'medium' }],
    talking_points: [{ topic: '', notes: '' }],
    decisions_needed: [{ decision: '', context: '' }],
    background_context: '',
  });

  // Load existing briefings
  const loadBriefings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meeting_briefings')
        .select(`
          *,
          meeting:timeline_items(title, start_time, end_time)
        `)
        .eq('prepared_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setBriefings((data as any) || []);
    } catch (error) {
      console.error('Error loading briefings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load briefings',
        variant: 'destructive',
      });
    }
  };

  // Load upcoming meetings without briefings
  const loadUpcomingMeetings = async () => {
    if (!user) return;

    try {
      // Get executives
      const { data: relationships } = await supabase
        .from('assistant_relationships')
        .select('executive_id')
        .eq('assistant_id', user.id)
        .eq('status', 'active');

      if (!relationships) return;

      const executiveIds = relationships.map(r => r.executive_id);

      // Get upcoming meetings
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { data: meetings, error } = await supabase
        .from('timeline_items')
        .select('*')
        .in('user_id', executiveIds)
        .gte('start_time', now)
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) throw error;

      // Filter out meetings that already have briefings
      const meetingsWithoutBriefings = meetings?.filter(meeting =>
        !briefings.some(b => b.meeting_id === meeting.id)
      ) || [];

      setUpcomingMeetings(meetingsWithoutBriefings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBriefings();
    }
  }, [user]);

  useEffect(() => {
    if (briefings.length >= 0) {
      loadUpcomingMeetings();
    }
  }, [briefings]);

  // Create new briefing
  const createBriefing = async () => {
    if (!user) return;

    try {
      const selectedMeeting = upcomingMeetings.find(m => m.id === formData.meeting_id);
      if (!selectedMeeting) {
        toast({
          title: 'Error',
          description: 'Please select a meeting',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('meeting_briefings').insert({
        meeting_id: formData.meeting_id,
        executive_id: selectedMeeting.user_id,
        prepared_by_user_id: user.id,
        briefing_title: formData.briefing_title || `Brief: ${selectedMeeting.title}`,
        executive_summary: formData.executive_summary,
        key_points: formData.key_points.filter(kp => kp.point.trim()),
        talking_points: formData.talking_points.filter(tp => tp.topic.trim()),
        decisions_needed: formData.decisions_needed.filter(d => d.decision.trim()),
        background_context: formData.background_context,
      });

      if (error) throw error;

      toast({
        title: 'Briefing Created',
        description: 'Meeting briefing has been created successfully',
      });

      setIsCreateDialogOpen(false);
      loadBriefings();

      // Reset form
      setFormData({
        meeting_id: '',
        executive_id: '',
        briefing_title: '',
        executive_summary: '',
        key_points: [{ point: '', priority: 'medium' }],
        talking_points: [{ topic: '', notes: '' }],
        decisions_needed: [{ decision: '', context: '' }],
        background_context: '',
      });
    } catch (error) {
      console.error('Error creating briefing:', error);
      toast({
        title: 'Error',
        description: 'Failed to create briefing',
        variant: 'destructive',
      });
    }
  };

  // Distribute briefing
  const distributeBriefing = async (briefingId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_briefings')
        .update({
          is_distributed: true,
          distributed_at: new Date().toISOString(),
        })
        .eq('id', briefingId);

      if (error) throw error;

      toast({
        title: 'Briefing Distributed',
        description: 'Executive has been notified',
      });

      loadBriefings();
    } catch (error) {
      console.error('Error distributing briefing:', error);
      toast({
        title: 'Error',
        description: 'Failed to distribute briefing',
        variant: 'destructive',
      });
    }
  };

  const addKeyPoint = () => {
    setFormData({
      ...formData,
      key_points: [...formData.key_points, { point: '', priority: 'medium' }],
    });
  };

  const addTalkingPoint = () => {
    setFormData({
      ...formData,
      talking_points: [...formData.talking_points, { topic: '', notes: '' }],
    });
  };

  const addDecision = () => {
    setFormData({
      ...formData,
      decisions_needed: [...formData.decisions_needed, { decision: '', context: '' }],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meeting Briefings</h2>
          <p className="text-muted-foreground">
            Prepare and distribute meeting packages
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Briefing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create Meeting Briefing</DialogTitle>
              <DialogDescription>
                Prepare a comprehensive briefing package for an upcoming meeting
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {/* Meeting Selection */}
                <div className="space-y-2">
                  <Label>Select Meeting</Label>
                  <Select
                    value={formData.meeting_id}
                    onValueChange={(value) => setFormData({ ...formData, meeting_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a meeting..." />
                    </SelectTrigger>
                    <SelectContent>
                      {upcomingMeetings.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>
                          {meeting.title} -{' '}
                          {new Date(meeting.start_time).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Briefing Title */}
                <div className="space-y-2">
                  <Label>Briefing Title</Label>
                  <Input
                    value={formData.briefing_title}
                    onChange={(e) => setFormData({ ...formData, briefing_title: e.target.value })}
                    placeholder="Brief: Board Meeting Q4 2024"
                  />
                </div>

                {/* Executive Summary */}
                <div className="space-y-2">
                  <Label>Executive Summary</Label>
                  <Textarea
                    value={formData.executive_summary}
                    onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
                    placeholder="High-level overview of the meeting purpose and expected outcomes..."
                    rows={3}
                  />
                </div>

                {/* Key Points */}
                <div className="space-y-2">
                  <Label>Key Points</Label>
                  {formData.key_points.map((kp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={kp.point}
                        onChange={(e) => {
                          const newPoints = [...formData.key_points];
                          newPoints[index].point = e.target.value;
                          setFormData({ ...formData, key_points: newPoints });
                        }}
                        placeholder="Key point to cover..."
                      />
                      <Select
                        value={kp.priority}
                        onValueChange={(value) => {
                          const newPoints = [...formData.key_points];
                          newPoints[index].priority = value;
                          setFormData({ ...formData, key_points: newPoints });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addKeyPoint}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Key Point
                  </Button>
                </div>

                {/* Talking Points */}
                <div className="space-y-2">
                  <Label>Talking Points</Label>
                  {formData.talking_points.map((tp, index) => (
                    <div key={index} className="space-y-1">
                      <Input
                        value={tp.topic}
                        onChange={(e) => {
                          const newPoints = [...formData.talking_points];
                          newPoints[index].topic = e.target.value;
                          setFormData({ ...formData, talking_points: newPoints });
                        }}
                        placeholder="Topic..."
                      />
                      <Input
                        value={tp.notes}
                        onChange={(e) => {
                          const newPoints = [...formData.talking_points];
                          newPoints[index].notes = e.target.value;
                          setFormData({ ...formData, talking_points: newPoints });
                        }}
                        placeholder="Notes..."
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addTalkingPoint}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Talking Point
                  </Button>
                </div>

                {/* Background Context */}
                <div className="space-y-2">
                  <Label>Background Context</Label>
                  <Textarea
                    value={formData.background_context}
                    onChange={(e) => setFormData({ ...formData, background_context: e.target.value })}
                    placeholder="Relevant background information, previous decisions, history..."
                    rows={3}
                  />
                </div>

                {/* Decisions Needed */}
                <div className="space-y-2">
                  <Label>Decisions Needed</Label>
                  {formData.decisions_needed.map((d, index) => (
                    <div key={index} className="space-y-1">
                      <Input
                        value={d.decision}
                        onChange={(e) => {
                          const newDecisions = [...formData.decisions_needed];
                          newDecisions[index].decision = e.target.value;
                          setFormData({ ...formData, decisions_needed: newDecisions });
                        }}
                        placeholder="Decision required..."
                      />
                      <Input
                        value={d.context}
                        onChange={(e) => {
                          const newDecisions = [...formData.decisions_needed];
                          newDecisions[index].context = e.target.value;
                          setFormData({ ...formData, decisions_needed: newDecisions });
                        }}
                        placeholder="Context..."
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addDecision}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Decision
                  </Button>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createBriefing}>
                <FileText className="h-4 w-4 mr-2" />
                Create Briefing
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Briefing List */}
      <div className="grid gap-4">
        {briefings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No briefings created yet. Create your first meeting briefing!
              </p>
            </CardContent>
          </Card>
        ) : (
          briefings.map((briefing) => (
            <Card key={briefing.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{briefing.briefing_title}</CardTitle>
                    <CardDescription className="mt-1">
                      {briefing.meeting && (
                        <>
                          {(briefing.meeting as any)[0]?.title} •{' '}
                          {new Date((briefing.meeting as any)[0]?.start_time).toLocaleDateString()}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={briefing.is_distributed ? 'default' : 'secondary'}>
                      {briefing.is_distributed ? (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          Distributed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Draft
                        </>
                      )}
                    </Badge>
                    {briefing.is_read && (
                      <Badge variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Read
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {briefing.executive_summary && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {briefing.executive_summary}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{briefing.key_points?.length || 0} key points</span>
                  <span>•</span>
                  <span>{briefing.talking_points?.length || 0} talking points</span>
                  <span>•</span>
                  <span>Version {briefing.version}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  {!briefing.is_distributed && (
                    <Button
                      size="sm"
                      onClick={() => distributeBriefing(briefing.id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Distribute
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
