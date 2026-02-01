import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RoleMode,
  AttentionType,
  ROLE_MODE_DESCRIPTIONS,
  ATTENTION_TYPE_DESCRIPTIONS,
  ROLE_MODES,
  ATTENTION_TYPES,
} from '@/lib/attentionTypes';
import { LayoutTemplate, Clock, Target, Users, Search } from 'lucide-react';

interface RoleTemplate {
  id: string;
  title: string;
  description: string;
  attentionType: AttentionType;
  suggestedDuration: number; // in minutes
  priority: number;
  isNonNegotiable?: boolean;
  tags?: string[];
}

interface RoleBasedTemplatesProps {
  currentRole?: RoleMode;
  onTemplateSelect: (template: RoleTemplate) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

// Template definitions for each role
const ROLE_TEMPLATES: Record<RoleMode, RoleTemplate[]> = {
  [ROLE_MODES.MAKER]: [
    {
      id: 'deep-work-4h',
      title: 'Deep Work Session',
      description: 'Extended focus time for complex creative or technical work',
      attentionType: ATTENTION_TYPES.CREATE,
      suggestedDuration: 240,
      priority: 5,
      isNonNegotiable: true,
      tags: ['focus', 'deep-work'],
    },
    {
      id: 'design-sprint',
      title: 'Design/Build Sprint',
      description: 'Concentrated design or development work with deliverable',
      attentionType: ATTENTION_TYPES.CREATE,
      suggestedDuration: 180,
      priority: 4,
      tags: ['sprint', 'deliverable'],
    },
    {
      id: 'code-review',
      title: 'Code Review Block',
      description: 'Dedicated time for reviewing team code and pull requests',
      attentionType: ATTENTION_TYPES.REVIEW,
      suggestedDuration: 90,
      priority: 3,
      tags: ['review', 'team'],
    },
    {
      id: 'learning-research',
      title: 'Learning & Research',
      description: 'Skill development or technology research',
      attentionType: ATTENTION_TYPES.CREATE,
      suggestedDuration: 120,
      priority: 2,
      tags: ['learning', 'research'],
    },
  ],

  [ROLE_MODES.MARKER]: [
    {
      id: 'decision-batch',
      title: 'Decision Batch',
      description: 'Cluster multiple decisions to minimize decision fatigue',
      attentionType: ATTENTION_TYPES.DECIDE,
      suggestedDuration: 90,
      priority: 5,
      isNonNegotiable: true,
      tags: ['decisions', 'batch'],
    },
    {
      id: 'stakeholder-review',
      title: 'Stakeholder Review',
      description: 'Review deliverables and provide direction to team',
      attentionType: ATTENTION_TYPES.REVIEW,
      suggestedDuration: 60,
      priority: 4,
      tags: ['review', 'stakeholders'],
    },
    {
      id: 'project-planning',
      title: 'Project Planning',
      description: 'Strategic planning and roadmap decisions',
      attentionType: ATTENTION_TYPES.DECIDE,
      suggestedDuration: 120,
      priority: 4,
      tags: ['planning', 'strategy'],
    },
    {
      id: 'team-sync',
      title: 'Team Sync & Direction',
      description: 'Align team on priorities and remove blockers',
      attentionType: ATTENTION_TYPES.CONNECT,
      suggestedDuration: 45,
      priority: 3,
      tags: ['sync', 'team'],
    },
  ],

  [ROLE_MODES.MULTIPLIER]: [
    {
      id: 'delegation-block',
      title: 'Delegation & Handoffs',
      description: 'Review work to delegate and hand off to team',
      attentionType: ATTENTION_TYPES.CONNECT,
      suggestedDuration: 60,
      priority: 5,
      tags: ['delegation', 'handoffs'],
    },
    {
      id: 'one-on-ones',
      title: 'One-on-One Meetings',
      description: 'Individual team member development and support',
      attentionType: ATTENTION_TYPES.CONNECT,
      suggestedDuration: 30,
      priority: 4,
      tags: ['1:1', 'coaching'],
    },
    {
      id: 'strategic-connect',
      title: 'Strategic Connections',
      description: 'Cross-team collaboration and relationship building',
      attentionType: ATTENTION_TYPES.CONNECT,
      suggestedDuration: 45,
      priority: 3,
      tags: ['strategy', 'connections'],
    },
    {
      id: 'team-enablement',
      title: 'Team Enablement Session',
      description: 'Provide context, unblock, and enable team success',
      attentionType: ATTENTION_TYPES.CONNECT,
      suggestedDuration: 90,
      priority: 4,
      isNonNegotiable: true,
      tags: ['enablement', 'unblocking'],
    },
  ],
};

export function RoleBasedTemplates({
  currentRole,
  onTemplateSelect,
  trigger,
  disabled = false,
}: RoleBasedTemplatesProps) {
  const templates = currentRole ? ROLE_TEMPLATES[currentRole] : [];

  const defaultTrigger = (
    <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
      <LayoutTemplate className="h-4 w-4" />
      <span>Templates</span>
    </Button>
  );

  if (!currentRole || templates.length === 0) {
    return null;
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
            {roleDesc.label} Mode Templates
          </DialogTitle>
          <DialogDescription>
            Quick templates optimized for {roleDesc.label.toLowerCase()} productivity patterns.
            {roleDesc.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {templates.map((template) => {
            const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {template.title}
                        {template.isNonNegotiable && (
                          <Badge variant="destructive" className="text-xs">
                            Non-negotiable
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {template.description}
                      </CardDescription>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: attentionDesc.color + '20', color: attentionDesc.color }}
                      >
                        <span className="mr-1">{attentionDesc.icon}</span>
                        {attentionDesc.label}
                      </Badge>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {Math.round(template.suggestedDuration / 60 * 10) / 10}h
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {(template.tags && template.tags.length > 0) && (
                  <CardContent className="pt-0">
                    <div className="flex gap-1 flex-wrap">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Tip:</strong> Templates are optimized for your current {roleDesc.label} mode.</p>
            <p>Non-negotiable items are protected from interruptions and context switching.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for use in small spaces
export function RoleBasedTemplatesCompact({
  currentRole,
  onTemplateSelect,
  disabled = false,
}: RoleBasedTemplatesProps) {
  const templates = currentRole ? ROLE_TEMPLATES[currentRole] : [];

  if (!currentRole || templates.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-center mb-3">
            {ROLE_MODE_DESCRIPTIONS[currentRole].label} Templates
          </h4>

          {templates.slice(0, 3).map((template) => {
            const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

            return (
              <Button
                key={template.id}
                variant="ghost"
                size="sm"
                onClick={() => onTemplateSelect(template)}
                className="w-full justify-start h-auto p-3"
              >
                <div className="flex items-start gap-2 w-full">
                  <span style={{ color: attentionDesc.color }}>{attentionDesc.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{template.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(template.suggestedDuration / 60 * 10) / 10}h • {attentionDesc.label}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}

          {templates.length > 3 && (
            <div className="text-xs text-center text-muted-foreground pt-1">
              +{templates.length - 3} more in full view
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}