import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  RoleOptimizer,
  createRoleOptimizer,
  RoleFitScore,
  OptimizationSuggestion,
  ROLE_OPTIMIZATION_RULES,
} from '@/lib/roleOptimizer';
import {
  ROLE_MODE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  ATTENTION_TYPE_DESCRIPTIONS,
  RoleMode,
  ZoneContext,
  AttentionType,
} from '@/lib/attentionTypes';
import { TimelineItem, UserAttentionPreferences } from '@/lib/timelineUtils';
import { useTimelineContext } from '@/contexts/TimelineContext';
import {
  TrendingUp,
  Target,
  Clock,
  Users,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Settings,
  Zap,
  Brain,
  Timer,
  Focus,
} from 'lucide-react';

interface RoleOptimizationPanelProps {
  trigger?: React.ReactNode;
  onOptimizationApply?: (suggestion: OptimizationSuggestion) => void;
}

export function RoleOptimizationPanel({
  trigger,
  onOptimizationApply,
}: RoleOptimizationPanelProps) {
  const { items, attentionPreferences } = useTimelineContext();
  const [roleFitScore, setRoleFitScore] = useState<RoleFitScore | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <BarChart3 className="h-4 w-4" />
      Role Optimization
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

  // Calculate optimization data
  useEffect(() => {
    if (attentionPreferences && items.length > 0) {
      setLoading(true);
      try {
        const optimizer = createRoleOptimizer(attentionPreferences);

        // Calculate role fit for current week
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

        // Generate optimization suggestions
        const suggestions = optimizer.generateOptimizationSuggestions(items, selectedDate);
        setOptimizationSuggestions(suggestions);
      } catch (error) {
        console.error('Error calculating role optimization:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [attentionPreferences, items, selectedDate]);

  if (!attentionPreferences) {
    return null;
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[attentionPreferences.current_role];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[attentionPreferences.current_zone];
  const rules = ROLE_OPTIMIZATION_RULES[attentionPreferences.current_role];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Role-Based Optimization Dashboard
            {loading && <div className="animate-pulse w-4 h-4 bg-muted-foreground/20 rounded" />}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
              <span>{roleDesc.label} Mode</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span style={{ color: zoneDesc.color }}>{zoneDesc.icon}</span>
              <span>{zoneDesc.label} Context</span>
            </div>
            {roleFitScore && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <span className="text-sm">Overall Fit:</span>
                  <Progress value={roleFitScore.score} className="w-20 h-2" />
                  <Badge variant={roleFitScore.score > 70 ? "default" : roleFitScore.score > 50 ? "secondary" : "destructive"}>
                    {roleFitScore.score}%
                  </Badge>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="py-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Deep Analysis
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
              {optimizationSuggestions.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {optimizationSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Role Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {roleFitScore ? (
              <>
                {/* Overall Score and Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="text-center">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-3xl" style={{ color: getRoleScoreColor(roleFitScore.score) }}>
                        {roleFitScore.score}%
                      </CardTitle>
                      <CardDescription>Overall Role Fit</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {getScoreDescription(roleFitScore.score)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Focus className="h-4 w-4" />
                        Best Practices
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {roleFitScore.breakdown.timeAllocation > 70 && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Good time allocation
                          </div>
                        )}
                        {roleFitScore.breakdown.energyAlignment > 70 && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Peak hours aligned
                          </div>
                        )}
                        {roleFitScore.breakdown.contextSwitching > 70 && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Low context switching
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {roleFitScore.breakdown.timeAllocation <= 70 && (
                          <div className="text-sm text-orange-600">
                            • Time allocation needs adjustment
                          </div>
                        )}
                        {roleFitScore.breakdown.energyAlignment <= 70 && (
                          <div className="text-sm text-orange-600">
                            • Peak hours not optimized
                          </div>
                        )}
                        {roleFitScore.breakdown.contextSwitching <= 70 && (
                          <div className="text-sm text-orange-600">
                            • Too much context switching
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Breakdown Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Detailed Breakdown
                    </CardTitle>
                    <CardDescription>
                      How well your current schedule aligns with {roleDesc.label} mode requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Time Allocation</span>
                          <span className="text-sm text-muted-foreground">{roleFitScore.breakdown.timeAllocation}%</span>
                        </div>
                        <Progress value={roleFitScore.breakdown.timeAllocation} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Preferred attention types
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Attention Balance</span>
                          <span className="text-sm text-muted-foreground">{roleFitScore.breakdown.attentionBalance}%</span>
                        </div>
                        <Progress value={roleFitScore.breakdown.attentionBalance} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Budget adherence
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Context Switching</span>
                          <span className="text-sm text-muted-foreground">{roleFitScore.breakdown.contextSwitching}%</span>
                        </div>
                        <Progress value={roleFitScore.breakdown.contextSwitching} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Cognitive efficiency
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Energy Alignment</span>
                          <span className="text-sm text-muted-foreground">{roleFitScore.breakdown.energyAlignment}%</span>
                        </div>
                        <Progress value={roleFitScore.breakdown.energyAlignment} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Peak hours usage
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Recommendations */}
                {roleFitScore.recommendations.length > 0 && (
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Quick Wins</AlertTitle>
                    <AlertDescription>
                      <ul className="space-y-1 mt-2">
                        {roleFitScore.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="text-sm">• {rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Timeline Data</h3>
                <p className="text-sm">Add some timeline items to see detailed role optimization analysis.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {roleFitScore ? (
              <div className="space-y-6">
                {/* Role-Specific Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
                      {roleDesc.label} Mode Analysis
                    </CardTitle>
                    <CardDescription>{roleDesc.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Preferred Attention Types</h4>
                        <div className="flex gap-2 flex-wrap">
                          {roleDesc.behaviors.preferredAttentionTypes.map(type => {
                            const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[type];
                            return (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="text-xs"
                                style={{ backgroundColor: attentionDesc.color + '20', color: attentionDesc.color }}
                              >
                                <span className="mr-1">{attentionDesc.icon}</span>
                                {attentionDesc.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Role-Specific Tips</h4>
                        <ul className="space-y-1">
                          {roleDesc.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-muted-foreground">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zone Context Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span style={{ color: zoneDesc.color }}>{zoneDesc.icon}</span>
                      {zoneDesc.label} Zone Context
                    </CardTitle>
                    <CardDescription>{zoneDesc.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Behavioral Adjustments</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Flexibility: {Math.round(zoneDesc.behaviors.flexibilityFactor * 100)}%</li>
                          <li>• Interruption tolerance: {Math.round(zoneDesc.behaviors.interruptionTolerance * 100)}%</li>
                          <li>• Meeting limit: {Math.round(zoneDesc.behaviors.meetingLimitMultiplier * 100)}% of normal</li>
                          <li>• Non-negotiable enforcement: {zoneDesc.behaviors.nonNegotiableEnforcement ? 'Strict' : 'Flexible'}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Zone-Specific Tips</h4>
                        <ul className="space-y-1">
                          {zoneDesc.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-muted-foreground">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Warnings */}
                {roleFitScore.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Critical Issues</AlertTitle>
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
                <Brain className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Analysis Data</h3>
                <p className="text-sm">Timeline data needed for deep role analysis.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {optimizationSuggestions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Optimization Suggestions</h3>
                    <p className="text-sm text-muted-foreground">AI-powered recommendations to improve your {roleDesc.label} mode effectiveness</p>
                  </div>
                  <Badge variant="outline">
                    {optimizationSuggestions.length} suggestions
                  </Badge>
                </div>

                <div className="space-y-3">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <Card key={index} className="border-l-4" style={{
                      borderLeftColor: getSuggestionColor(suggestion.priority)
                    }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {getSuggestionIcon(suggestion.type)}
                              {suggestion.title}
                              <Badge variant={getSuggestionBadgeVariant(suggestion.priority)}>
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
                            {suggestion.suggestedDuration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.round(suggestion.suggestedDuration / 60 * 10) / 10}h
                              </Badge>
                            )}
                            {onOptimizationApply && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOptimizationApply(suggestion)}
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
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium">Well Optimized!</h3>
                <p className="text-sm">Your current schedule aligns well with your {roleDesc.label} role in {zoneDesc.label} mode.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {roleDesc.label} Mode Rules
                </CardTitle>
                <CardDescription>
                  Optimization parameters and limits for your current role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Role-specific rules */}
                  {attentionPreferences.current_role === 'maker' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Focus Requirements</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Minimum focus block: {rules.minFocusBlock} minutes</li>
                          <li>• Max meetings per day: {rules.maxMeetings}</li>
                          <li>• Max context switches (4h): {rules.maxContextSwitches}</li>
                          <li>• Fragmentation threshold: {rules.fragmentationThreshold} minutes</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Protected Hours</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {rules.protectedHours.map((period, index) => (
                            <li key={index}>• {period}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {attentionPreferences.current_role === 'marker' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Decision Management</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Max decision blocks: {rules.maxDecisionBlocks} per day</li>
                          <li>• Decision batch gap: {rules.decisionBatchGap} minutes</li>
                          <li>• Review window size: {rules.reviewWindowSize} minutes</li>
                          <li>• Batch threshold: {rules.batchThreshold} decisions</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Fatigue Prevention</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Decision fatigue limit: {rules.decisionFatigueLimit} per hour</li>
                          <li>• Recovery time: Required between blocks</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {attentionPreferences.current_role === 'multiplier' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Connection Optimization</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Connection block size: {rules.connectionBlockSize} minutes</li>
                          <li>• Min team time: {rules.minTeamTime} minutes/day</li>
                          <li>• Routing efficiency: {rules.routingEfficiency} requests/hour</li>
                          <li>• Delegation threshold: {rules.delegationThreshold} minutes</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Personal Work Limits</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Max personal create time: {rules.maxPersonalCreateTime} minutes</li>
                          <li>• Focus on enabling others</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Current attention budgets */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Attention Budgets</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{attentionPreferences.attention_budgets.decide}</div>
                        <div className="text-xs text-muted-foreground">Decide blocks/day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{attentionPreferences.attention_budgets.context_switches}</div>
                        <div className="text-xs text-muted-foreground">Context switches/day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{attentionPreferences.attention_budgets.meetings}</div>
                        <div className="text-xs text-muted-foreground">Meetings/day</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getRoleScoreColor(score: number): string {
  if (score > 70) return '#10b981'; // Green
  if (score > 50) return '#f59e0b'; // Orange
  return '#ef4444'; // Red
}

function getScoreDescription(score: number): string {
  if (score > 80) return 'Excellent role alignment';
  if (score > 70) return 'Good role alignment';
  if (score > 50) return 'Fair role alignment';
  if (score > 30) return 'Poor role alignment';
  return 'Very poor role alignment';
}

function getSuggestionColor(priority: string): string {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
}

function getSuggestionBadgeVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case 'schedule': return <Clock className="h-4 w-4" />;
    case 'batch': return <Target className="h-4 w-4" />;
    case 'delegate': return <Users className="h-4 w-4" />;
    case 'reschedule': return <Timer className="h-4 w-4" />;
    case 'protect': return <AlertTriangle className="h-4 w-4" />;
    case 'split': return <Zap className="h-4 w-4" />;
    case 'merge': return <Focus className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
}