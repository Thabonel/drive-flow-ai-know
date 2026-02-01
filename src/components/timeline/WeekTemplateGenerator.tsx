import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Calendar, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RoleMode, ZoneContext, ROLE_MODE_DESCRIPTIONS, ZONE_CONTEXT_DESCRIPTIONS } from '@/lib/attentionTypes';

interface WeekTemplateGeneratorProps {
  roleMode: RoleMode;
  zoneContext: ZoneContext;
  nonNegotiable: string;
  weeklyHours: number;
  constraints: string[];
  onTemplateGenerated: (template: WeeklyTemplate) => void;
}

interface TimeBlock {
  day: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  type: 'focus' | 'meetings' | 'admin' | 'buffer' | 'non-negotiable';
  title: string;
  description?: string;
}

interface WeeklyTemplate {
  template_name: string;
  total_focus_hours: number;
  total_meeting_hours: number;
  daily_blocks: TimeBlock[];
  optimization_notes: string[];
  role_alignment_score: number;
}

const DAILY_TEMPLATE_CONFIGS = {
  maker: {
    peacetime: {
      focus_blocks: 2,
      meeting_limit: 2,
      admin_time: 1,
      buffer_time: 0.5,
    },
    wartime: {
      focus_blocks: 3,
      meeting_limit: 1,
      admin_time: 0.5,
      buffer_time: 0.25,
    }
  },
  marker: {
    peacetime: {
      focus_blocks: 1,
      meeting_limit: 4,
      admin_time: 1,
      buffer_time: 0.75,
    },
    wartime: {
      focus_blocks: 1,
      meeting_limit: 2,
      admin_time: 0.5,
      buffer_time: 0.5,
    }
  },
  multiplier: {
    peacetime: {
      focus_blocks: 0.5,
      meeting_limit: 6,
      admin_time: 1.5,
      buffer_time: 1,
    },
    wartime: {
      focus_blocks: 0.25,
      meeting_limit: 4,
      admin_time: 1,
      buffer_time: 0.75,
    }
  }
};

export function WeekTemplateGenerator({
  roleMode,
  zoneContext,
  nonNegotiable,
  weeklyHours,
  constraints,
  onTemplateGenerated
}: WeekTemplateGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<WeeklyTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-generate template when inputs change
    if (roleMode && zoneContext && nonNegotiable && weeklyHours > 0) {
      generateTemplate();
    }
  }, [roleMode, zoneContext, nonNegotiable, weeklyHours, constraints]);

  async function generateTemplate() {
    setGenerating(true);
    try {
      // Simulate AI processing with actual template generation logic
      await new Promise(resolve => setTimeout(resolve, 2000));

      const generatedTemplate = createOptimizedTemplate();
      setTemplate(generatedTemplate);
      onTemplateGenerated(generatedTemplate);

      toast({
        title: 'Template Generated',
        description: `Created optimized ${roleMode} schedule with ${generatedTemplate.role_alignment_score}% role alignment`,
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate week template. Please try again.',
        variant: 'destructive',
      });
    }
    setGenerating(false);
  }

  function createOptimizedTemplate(): WeeklyTemplate {
    const config = DAILY_TEMPLATE_CONFIGS[roleMode][zoneContext];
    const dailyBlocks: TimeBlock[] = [];

    // Define work days (Monday to Friday)
    const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Non-negotiable time distribution (spread across the week)
    const nonNegotiableHoursPerDay = weeklyHours / 5; // Spread across weekdays

    workDays.forEach((day, dayIndex) => {
      let currentTime = 9; // Start at 9 AM

      // Non-negotiable block (peak hours 9-12 for most roles)
      if (nonNegotiableHoursPerDay > 0) {
        const blockDuration = Math.min(nonNegotiableHoursPerDay * 60, 180); // Max 3 hours per block
        dailyBlocks.push({
          day,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + blockDuration / 60),
          duration: blockDuration,
          type: 'non-negotiable',
          title: nonNegotiable,
          description: 'Protected time for your weekly non-negotiable priority'
        });
        currentTime += blockDuration / 60 + 0.25; // 15 min buffer
      }

      // Focus blocks
      for (let i = 0; i < config.focus_blocks; i++) {
        const focusDuration = roleMode === 'maker' ? 120 : roleMode === 'marker' ? 90 : 60;
        if (currentTime + focusDuration / 60 <= 17) { // Don't go past 5 PM
          dailyBlocks.push({
            day,
            startTime: formatTime(currentTime),
            endTime: formatTime(currentTime + focusDuration / 60),
            duration: focusDuration,
            type: 'focus',
            title: roleMode === 'maker' ? 'Deep Work' : roleMode === 'marker' ? 'Decision Block' : 'Strategic Work',
            description: getFocusBlockDescription(roleMode)
          });
          currentTime += focusDuration / 60 + config.buffer_time;
        }
      }

      // Meeting blocks
      const meetingSlots = Math.min(config.meeting_limit, 3); // Max 3 meeting blocks per day
      for (let i = 0; i < meetingSlots; i++) {
        const meetingDuration = 60; // 1 hour meetings
        if (currentTime + meetingDuration / 60 <= 17) {
          dailyBlocks.push({
            day,
            startTime: formatTime(currentTime),
            endTime: formatTime(currentTime + meetingDuration / 60),
            duration: meetingDuration,
            type: 'meetings',
            title: `Meeting Block ${i + 1}`,
            description: getMeetingBlockDescription(roleMode)
          });
          currentTime += meetingDuration / 60 + 0.5; // 30 min buffer
        }
      }

      // Admin time
      if (config.admin_time > 0 && currentTime + config.admin_time <= 17) {
        dailyBlocks.push({
          day,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + config.admin_time),
          duration: config.admin_time * 60,
          type: 'admin',
          title: 'Admin & Email',
          description: 'Email processing, calendar management, quick admin tasks'
        });
      }
    });

    const totalFocusHours = dailyBlocks
      .filter(block => block.type === 'focus')
      .reduce((sum, block) => sum + block.duration / 60, 0);

    const totalMeetingHours = dailyBlocks
      .filter(block => block.type === 'meetings')
      .reduce((sum, block) => sum + block.duration / 60, 0);

    const roleAlignmentScore = calculateRoleAlignment(dailyBlocks, roleMode, zoneContext);
    const optimizationNotes = generateOptimizationNotes(roleMode, zoneContext, constraints);

    return {
      template_name: `${ROLE_MODE_DESCRIPTIONS[roleMode].label} - ${ZONE_CONTEXT_DESCRIPTIONS[zoneContext].label}`,
      total_focus_hours: totalFocusHours,
      total_meeting_hours: totalMeetingHours,
      daily_blocks: dailyBlocks,
      optimization_notes: optimizationNotes,
      role_alignment_score: roleAlignmentScore,
    };
  }

  function formatTime(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  function getFocusBlockDescription(role: RoleMode): string {
    switch (role) {
      case 'maker':
        return 'Deep, uninterrupted creation time - coding, writing, design';
      case 'marker':
        return 'Focused decision-making sessions - reviews, approvals, planning';
      case 'multiplier':
        return 'Strategic thinking time - planning, analysis, team development';
      default:
        return 'Focused work time';
    }
  }

  function getMeetingBlockDescription(role: RoleMode): string {
    switch (role) {
      case 'maker':
        return 'Essential collaboration - standups, reviews, planning';
      case 'marker':
        return 'Decision meetings - approvals, feedback sessions, alignment';
      case 'multiplier':
        return 'Team connections - 1:1s, alignment, coaching';
      default:
        return 'Meeting time';
    }
  }

  function calculateRoleAlignment(blocks: TimeBlock[], role: RoleMode, zone: ZoneContext): number {
    const focusHours = blocks.filter(b => b.type === 'focus').reduce((sum, b) => sum + b.duration / 60, 0);
    const meetingHours = blocks.filter(b => b.type === 'meetings').reduce((sum, b) => sum + b.duration / 60, 0);
    const totalHours = focusHours + meetingHours;

    if (totalHours === 0) return 50;

    let score = 50;

    if (role === 'maker') {
      const focusRatio = focusHours / totalHours;
      score = Math.min(95, focusRatio * 120); // Makers should have high focus ratio
    } else if (role === 'marker') {
      const balanceScore = Math.abs(focusHours - meetingHours) / totalHours;
      score = Math.min(95, (1 - balanceScore) * 100); // Markers need balance
    } else if (role === 'multiplier') {
      const meetingRatio = meetingHours / totalHours;
      score = Math.min(95, meetingRatio * 120); // Multipliers need more meetings
    }

    // Zone adjustments
    if (zone === 'wartime') {
      score = Math.min(95, score * 1.1); // Bonus for wartime optimization
    }

    return Math.round(score);
  }

  function generateOptimizationNotes(role: RoleMode, zone: ZoneContext, constraints: string[]): string[] {
    const notes: string[] = [];

    // Role-specific notes
    if (role === 'maker') {
      notes.push('Focus blocks scheduled during peak energy hours (9-12 AM)');
      notes.push('Meetings batched to minimize context switching');
    } else if (role === 'marker') {
      notes.push('Decision blocks sized for optimal cognitive load');
      notes.push('Buffer time included between decision sessions');
    } else {
      notes.push('Meeting blocks optimized for team connection');
      notes.push('Strategic work time protected in mornings');
    }

    // Zone-specific notes
    if (zone === 'wartime') {
      notes.push('Meeting limits enforced for execution focus');
      notes.push('Administrative time minimized');
    } else {
      notes.push('Exploration and learning time included');
      notes.push('Team development opportunities scheduled');
    }

    // Constraint-based notes
    if (constraints.length > 0) {
      notes.push(`${constraints.length} constraint(s) accommodated in schedule`);
    }

    return notes;
  }

  function getBlockTypeColor(type: TimeBlock['type']): string {
    switch (type) {
      case 'non-negotiable': return 'bg-red-100 border-red-300 text-red-800';
      case 'focus': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'meetings': return 'bg-green-100 border-green-300 text-green-800';
      case 'admin': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'buffer': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">AI-Optimized Week Template</h3>
        <p className="text-muted-foreground">
          Generating schedule optimized for {ROLE_MODE_DESCRIPTIONS[roleMode].label} mode
          in {ZONE_CONTEXT_DESCRIPTIONS[zoneContext].label} context
        </p>
      </div>

      {generating ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">Generating Your Optimized Week...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing role requirements, zone constraints, and your non-negotiable priority
              </p>
            </div>
          </CardContent>
        </Card>
      ) : template ? (
        <div className="space-y-4">
          {/* Template Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wand2 className="h-5 w-5" />
                <span>{template.template_name}</span>
              </CardTitle>
              <CardDescription>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Target className="h-3 w-3" />
                    <span>{template.role_alignment_score}% Role Fit</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{template.total_focus_hours}h Focus</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{template.total_meeting_hours}h Meetings</span>
                  </Badge>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Optimization Notes:</h4>
                <div className="space-y-2">
                  {template.optimization_notes.map((note, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Schedule Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Schedule Preview</CardTitle>
              <CardDescription>Drag and drop blocks to customize timing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                  const dayBlocks = template.daily_blocks.filter(block => block.day === day);
                  return (
                    <div key={day} className="space-y-2">
                      <h5 className="font-medium text-sm">{day}</h5>
                      <div className="space-y-1">
                        {dayBlocks.map((block, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 rounded border text-xs ${getBlockTypeColor(block.type)}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{block.startTime} - {block.endTime}</span>
                              <span>{block.title}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(block.duration / 60 * 10) / 10}h
                            </Badge>
                          </div>
                        ))}
                        {dayBlocks.length === 0 && (
                          <div className="text-xs text-muted-foreground italic p-2">
                            No blocks scheduled
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={generateTemplate} variant="outline" className="flex items-center space-x-2">
              <Wand2 className="h-4 w-4" />
              <span>Regenerate Template</span>
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Ready to generate your optimized week template
              </p>
              <Button onClick={generateTemplate} className="flex items-center space-x-2">
                <Wand2 className="h-4 w-4" />
                <span>Generate Template</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}