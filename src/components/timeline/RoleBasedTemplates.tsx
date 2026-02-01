import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  RoleMode,
  AttentionType,
  ZoneContext,
  ROLE_MODE_DESCRIPTIONS,
  ATTENTION_TYPE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  ROLE_MODES,
  ATTENTION_TYPES,
} from '@/lib/attentionTypes';
import {
  RoleOptimizer,
  createRoleOptimizer,
  RoleFitScore,
  OptimizationSuggestion,
  getRoleTemplateDefaults,
} from '@/lib/roleOptimizer';
import { TimelineItem, UserAttentionPreferences } from '@/lib/timelineUtils';
import { LayoutTemplate, Clock, Target, Users, Search, Lightbulb, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useTimelineContext } from '@/contexts/TimelineContext';

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
  currentZone?: ZoneContext;
  onTemplateSelect: (template: RoleTemplate) => void;
  onOptimizationApply?: (suggestion: OptimizationSuggestion) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

interface SmartTemplate extends RoleTemplate {
  optimizationScore?: number;
  adaptiveReasoning?: string;
  zoneSpecific?: boolean;
}

// Enhanced template definitions with role optimization data
const generateSmartTemplates = (
  role: RoleMode,
  zone: ZoneContext,
  preferences?: UserAttentionPreferences
): SmartTemplate[] => {
  const baseTemplates = getBaseTemplatesForRole(role);
  const zoneAdjustments = ZONE_CONTEXT_DESCRIPTIONS[zone];

  return baseTemplates.map(template => {
    const defaults = getRoleTemplateDefaults(role, zone);
    const smartTemplate: SmartTemplate = {
      ...template,
      suggestedDuration: defaults.suggestedDuration || template.suggestedDuration,
      priority: defaults.priority || template.priority,
      isNonNegotiable: defaults.isNonNegotiable || template.isNonNegotiable,
      zoneSpecific: true,
      adaptiveReasoning: generateAdaptiveReasoning(template, role, zone),
      optimizationScore: calculateTemplateScore(template, role, zone),
    };

    // Zone-specific modifications
    if (zone === 'wartime') {
      smartTemplate.description += ` - Wartime optimization: ${zoneAdjustments.behaviors.nonNegotiableEnforcement ? 'Protected time' : 'Flexible scheduling'}`;
    } else {
      smartTemplate.description += ` - Peacetime mode: Explore and build relationships`;
    }

    return smartTemplate;
  });
};

const getBaseTemplatesForRole = (role: RoleMode): RoleTemplate[] => {
  const templates: Record<RoleMode, RoleTemplate[]> = {
    [ROLE_MODES.MAKER]: [
      {
        id: 'maker-focus-optimized',
        title: 'Optimized Deep Work',
        description: 'AI-optimized focus block for maximum creativity and productivity',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: 120, // Will be adjusted by zone
        priority: 5,
        isNonNegotiable: true,
        tags: ['focus', 'deep-work', 'optimized'],
      },
      {
        id: 'maker-flow-state',
        title: 'Flow State Session',
        description: 'Extended uninterrupted time designed for flow state achievement',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: 180,
        priority: 5,
        isNonNegotiable: true,
        tags: ['flow', 'uninterrupted', 'creation'],
      },
      {
        id: 'maker-morning-block',
        title: 'Morning Focus Block',
        description: 'Leverage peak morning energy for challenging creative work',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: 150,
        priority: 4,
        tags: ['morning', 'peak-energy', 'challenging'],
      },
      {
        id: 'maker-review-batch',
        title: 'Quality Review Session',
        description: 'Batch all review activities to maintain creation momentum',
        attentionType: ATTENTION_TYPES.REVIEW,
        suggestedDuration: 60,
        priority: 3,
        tags: ['review', 'batch', 'quality'],
      },
      {
        id: 'maker-learning-investment',
        title: 'Skill Investment Block',
        description: 'Protected time for learning and skill development',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: 90,
        priority: 2,
        tags: ['learning', 'investment', 'growth'],
      },
    ],

    [ROLE_MODES.MARKER]: [
      {
        id: 'marker-decision-cluster',
        title: 'Decision Cluster Session',
        description: 'Optimized batch processing of related decisions',
        attentionType: ATTENTION_TYPES.DECIDE,
        suggestedDuration: 90,
        priority: 5,
        isNonNegotiable: true,
        tags: ['decisions', 'batch', 'cluster'],
      },
      {
        id: 'marker-strategic-review',
        title: 'Strategic Review & Direction',
        description: 'High-level review and strategic decision making',
        attentionType: ATTENTION_TYPES.DECIDE,
        suggestedDuration: 120,
        priority: 5,
        isNonNegotiable: true,
        tags: ['strategic', 'direction', 'high-level'],
      },
      {
        id: 'marker-approval-sprint',
        title: 'Approval Sprint',
        description: 'Rapid processing of pending approvals and sign-offs',
        attentionType: ATTENTION_TYPES.DECIDE,
        suggestedDuration: 45,
        priority: 4,
        tags: ['approvals', 'sprint', 'rapid'],
      },
      {
        id: 'marker-quality-gate',
        title: 'Quality Gate Review',
        description: 'Thorough review of deliverables and quality standards',
        attentionType: ATTENTION_TYPES.REVIEW,
        suggestedDuration: 60,
        priority: 4,
        tags: ['quality', 'standards', 'thorough'],
      },
      {
        id: 'marker-team-direction',
        title: 'Team Direction Setting',
        description: 'Provide clear direction and remove team blockers',
        attentionType: ATTENTION_TYPES.CONNECT,
        suggestedDuration: 45,
        priority: 3,
        tags: ['direction', 'blockers', 'clarity'],
      },
    ],

    [ROLE_MODES.MULTIPLIER]: [
      {
        id: 'multiplier-delegation-review',
        title: 'Delegation Opportunity Review',
        description: 'Systematically identify and delegate tasks for team growth',
        attentionType: ATTENTION_TYPES.CONNECT,
        suggestedDuration: 60,
        priority: 5,
        tags: ['delegation', 'growth', 'systematic'],
      },
      {
        id: 'multiplier-enablement-block',
        title: 'Team Enablement Session',
        description: 'Focused time to unblock and enable team members',
        attentionType: ATTENTION_TYPES.CONNECT,
        suggestedDuration: 90,
        priority: 5,
        isNonNegotiable: true,
        tags: ['enablement', 'unblocking', 'team'],
      },
      {
        id: 'multiplier-connection-sprint',
        title: 'Strategic Connection Sprint',
        description: 'Build relationships and alignment across teams',
        attentionType: ATTENTION_TYPES.CONNECT,
        suggestedDuration: 30,
        priority: 4,
        tags: ['connections', 'alignment', 'cross-team'],
      },
      {
        id: 'multiplier-coaching-block',
        title: 'Coaching & Development',
        description: 'One-on-one coaching and team member development',
        attentionType: ATTENTION_TYPES.CONNECT,
        suggestedDuration: 45,
        priority: 4,
        tags: ['coaching', 'development', '1:1'],
      },
      {
        id: 'multiplier-strategic-create',
        title: 'Strategic Creation Time',
        description: 'Limited personal creation time for high-leverage work',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: 90,
        priority: 3,
        tags: ['strategic', 'high-leverage', 'personal'],
      },
    ],
  };

  return templates[role] || [];
};

const generateAdaptiveReasoning = (template: RoleTemplate, role: RoleMode, zone: ZoneContext): string => {
  const roleDesc = ROLE_MODE_DESCRIPTIONS[role];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[zone];

  let reasoning = `Optimized for ${roleDesc.label} mode`;

  if (zone === 'wartime') {
    reasoning += ` with wartime focus: ${zoneDesc.behaviors.nonNegotiableEnforcement ? 'strict protection' : 'flexible adaptation'}`;
  } else {
    reasoning += ` with peacetime exploration: emphasis on learning and relationship building`;
  }

  // Add attention type specific reasoning
  switch (template.attentionType) {
    case ATTENTION_TYPES.CREATE:
      reasoning += `. Duration optimized for deep flow state achievement.`;
      break;
    case ATTENTION_TYPES.DECIDE:
      reasoning += `. Batched to reduce decision fatigue and improve consistency.`;
      break;
    case ATTENTION_TYPES.CONNECT:
      reasoning += `. Sized for meaningful connection without overwhelming schedule.`;
      break;
    case ATTENTION_TYPES.REVIEW:
      reasoning += `. Batch processing to maintain momentum in other activities.`;
      break;
  }

  return reasoning;
};

const calculateTemplateScore = (template: RoleTemplate, role: RoleMode, zone: ZoneContext): number => {
  let score = 50; // Base score

  const rolePrefs = ROLE_MODE_DESCRIPTIONS[role].behaviors.preferredAttentionTypes;

  // Role compatibility
  if (rolePrefs.includes(template.attentionType)) {
    score += 30;
  }

  // Zone compatibility
  if (zone === 'wartime' && template.isNonNegotiable) {
    score += 15;
  } else if (zone === 'peacetime' && !template.isNonNegotiable) {
    score += 10;
  }

  // Duration appropriateness
  const optimalDuration = getRoleTemplateDefaults(role, zone).suggestedDuration || 60;
  const durationDiff = Math.abs(template.suggestedDuration - optimalDuration);
  score -= Math.min(20, durationDiff / 10);

  return Math.max(0, Math.min(100, Math.round(score)));
};

export function RoleBasedTemplates({
  currentRole,
  currentZone = 'peacetime',
  onTemplateSelect,
  onOptimizationApply,
  trigger,
  disabled = false,
}: RoleBasedTemplatesProps) {
  const { items, attentionPreferences } = useTimelineContext();
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);
  const [roleFitScore, setRoleFitScore] = useState<RoleFitScore | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate smart templates when role/zone changes
  useEffect(() => {
    if (currentRole) {
      const smartTemplates = generateSmartTemplates(currentRole, currentZone, attentionPreferences || undefined);
      setTemplates(smartTemplates);
    } else {
      setTemplates([]);
    }
  }, [currentRole, currentZone, attentionPreferences]);

  // Calculate role fit score and generate suggestions
  useEffect(() => {
    if (currentRole && attentionPreferences && items.length > 0) {
      setLoading(true);
      try {
        const optimizer = createRoleOptimizer(attentionPreferences);

        // Calculate role fit for this week
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const weekItems = items.filter(item => {
          const itemDate = new Date(item.start_time);
          return itemDate >= weekStart && itemDate <= weekEnd;
        });

        const score = optimizer.calculateRoleFitScore(weekItems);
        setRoleFitScore(score);

        // Generate optimization suggestions for today
        const suggestions = optimizer.generateOptimizationSuggestions(items, new Date());
        setOptimizationSuggestions(suggestions);
      } catch (error) {
        console.error('Error calculating role optimization:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [currentRole, attentionPreferences, items]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
      <LayoutTemplate className="h-4 w-4" />
      <span>Smart Templates</span>
      {roleFitScore && (
        <Badge
          variant={roleFitScore.score > 70 ? "default" : roleFitScore.score > 50 ? "secondary" : "destructive"}
          className="ml-2"
        >
          {roleFitScore.score}%
        </Badge>
      )}
    </Button>
  );

  if (!currentRole || templates.length === 0) {
    return null;
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[currentZone];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
            {roleDesc.label} Mode - {zoneDesc.label} Zone
            {loading && <div className="animate-pulse w-4 h-4 bg-muted-foreground/20 rounded" />}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>Smart templates and optimization for {roleDesc.label.toLowerCase()} productivity patterns in {zoneDesc.label.toLowerCase()} context.</div>
            {roleFitScore && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Weekly Role Fit:</span>
                <Progress value={roleFitScore.score} className="w-24 h-2" />
                <Badge variant={roleFitScore.score > 70 ? "default" : roleFitScore.score > 50 ? "secondary" : "destructive"}>
                  {roleFitScore.score}%
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="py-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Smart Templates
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Optimization
              {optimizationSuggestions.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {optimizationSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Role Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4">
              {templates.map((template) => {
                const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4"
                    style={{ borderLeftColor: attentionDesc.color }}
                    onClick={() => onTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {template.title}
                            {template.isNonNegotiable && (
                              <Badge variant="destructive" className="text-xs">
                                Protected
                              </Badge>
                            )}
                            {template.zoneSpecific && (
                              <Badge variant="outline" className="text-xs" style={{ color: zoneDesc.color }}>
                                {zoneDesc.icon} {zoneDesc.label}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.description}
                          </CardDescription>
                          {template.adaptiveReasoning && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Lightbulb className="h-3 w-3" />
                              <span>{template.adaptiveReasoning}</span>
                            </div>
                          )}
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

                          {template.optimizationScore && (
                            <Badge
                              variant={template.optimizationScore > 80 ? "default" : template.optimizationScore > 60 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {template.optimizationScore}% fit
                            </Badge>
                          )}
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
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {optimizationSuggestions.length > 0 ? (
              <div className="space-y-3">
                {optimizationSuggestions.map((suggestion, index) => (
                  <Card key={index} className="border-l-4" style={{
                    borderLeftColor: suggestion.priority === 'high' ? '#ef4444' : suggestion.priority === 'medium' ? '#f59e0b' : '#10b981'
                  }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {suggestion.type === 'schedule' && <Clock className="h-4 w-4" />}
                            {suggestion.type === 'batch' && <Target className="h-4 w-4" />}
                            {suggestion.type === 'delegate' && <Users className="h-4 w-4" />}
                            {suggestion.type === 'protect' && <AlertTriangle className="h-4 w-4" />}
                            {suggestion.title}
                            <Badge variant={
                              suggestion.priority === 'high' ? 'destructive' :
                              suggestion.priority === 'medium' ? 'default' :
                              'secondary'
                            }>
                              {suggestion.priority}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {suggestion.description}
                          </CardDescription>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Lightbulb className="h-3 w-3" />
                            <span>{suggestion.reasoning}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {suggestion.itemIds.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {suggestion.itemIds.length} items
                            </Badge>
                          )}
                          {onOptimizationApply && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOptimizationApply(suggestion);
                              }}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium">Well Optimized!</h3>
                <p className="text-sm">Your current schedule aligns well with your {roleDesc.label} role in {zoneDesc.label} mode.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {roleFitScore ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold">{roleFitScore.breakdown.timeAllocation}%</div>
                    <div className="text-xs text-muted-foreground">Time Allocation</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold">{roleFitScore.breakdown.attentionBalance}%</div>
                    <div className="text-xs text-muted-foreground">Attention Balance</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold">{roleFitScore.breakdown.contextSwitching}%</div>
                    <div className="text-xs text-muted-foreground">Context Switching</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold">{roleFitScore.breakdown.energyAlignment}%</div>
                    <div className="text-xs text-muted-foreground">Energy Alignment</div>
                  </Card>
                </div>

                {roleFitScore.recommendations.length > 0 && (
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="space-y-1 mt-2">
                        {roleFitScore.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">• {rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {roleFitScore.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="space-y-1 mt-2">
                        {roleFitScore.warnings.map((warning, index) => (
                          <li key={index} className="text-sm">• {warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Timeline Data</h3>
                <p className="text-sm">Add some timeline items to see role-based analysis and optimization suggestions.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Smart Templates:</strong> AI-optimized for your {roleDesc.label} role in {zoneDesc.label} context.</p>
            <p><strong>Zone Context:</strong> {zoneDesc.description}</p>
            {roleFitScore && (
              <p><strong>Current Fit:</strong> {roleFitScore.score}% alignment with role optimization patterns.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for use in small spaces
export function RoleBasedTemplatesCompact({
  currentRole,
  currentZone = 'peacetime',
  onTemplateSelect,
  disabled = false,
}: RoleBasedTemplatesProps) {
  const { attentionPreferences } = useTimelineContext();
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);

  useEffect(() => {
    if (currentRole) {
      const smartTemplates = generateSmartTemplates(currentRole, currentZone, attentionPreferences || undefined);
      setTemplates(smartTemplates.slice(0, 4)); // Show top 4 in compact view
    } else {
      setTemplates([]);
    }
  }, [currentRole, currentZone, attentionPreferences]);

  if (!currentRole || templates.length === 0) {
    return null;
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          <span className="hidden sm:inline">Smart Templates</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3">
        <div className="space-y-3">
          <div className="text-center">
            <h4 className="font-semibold text-sm flex items-center justify-center gap-2">
              <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
              {roleDesc.label} Smart Templates
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Optimized for {ZONE_CONTEXT_DESCRIPTIONS[currentZone].label} mode
            </p>
          </div>

          <div className="space-y-2">
            {templates.map((template) => {
              const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

              return (
                <Button
                  key={template.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTemplateSelect(template)}
                  className="w-full justify-start h-auto p-3 border-l-2"
                  style={{ borderLeftColor: attentionDesc.color }}
                >
                  <div className="flex items-start gap-2 w-full">
                    <span style={{ color: attentionDesc.color }}>{attentionDesc.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{template.title}</span>
                        {template.isNonNegotiable && (
                          <Badge variant="destructive" className="text-xs">
                            Protected
                          </Badge>
                        )}
                        {template.optimizationScore && template.optimizationScore > 80 && (
                          <Badge variant="default" className="text-xs">
                            {template.optimizationScore}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(template.suggestedDuration / 60 * 10) / 10}h • {attentionDesc.label}
                      </div>
                      {template.adaptiveReasoning && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          {template.adaptiveReasoning.split('.')[0]}.
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="border-t pt-2">
            <div className="text-xs text-center text-muted-foreground">
              AI-optimized templates for maximum productivity
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}