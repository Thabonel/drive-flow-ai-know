/**
 * Demo component showcasing the complete Role-Based Optimization System
 * This demonstrates how all optimization features work together
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RoleBasedTemplates,
  RoleBasedTemplatesCompact,
} from './RoleBasedTemplates';
import { RoleOptimizationPanel } from './RoleOptimizationPanel';
import { DelegationButton } from './DelegationButton';
import { useRoleOptimizer, useRoleFitMonitor } from '@/hooks/useRoleOptimizer';
import { useTimelineContext } from '@/contexts/TimelineContext';
import {
  ROLE_MODES,
  ZONE_CONTEXTS,
  ROLE_MODE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  RoleMode,
  ZoneContext,
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  BarChart3,
  Target,
  Zap,
  Users,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Lightbulb,
} from 'lucide-react';

interface RoleOptimizationDemoProps {
  className?: string;
}

export function RoleOptimizationDemo({
  className = '',
}: RoleOptimizationDemoProps) {
  const { items, attentionPreferences, updateAttentionPreferences } = useTimelineContext();
  const [selectedRole, setSelectedRole] = useState<RoleMode>(attentionPreferences?.current_role || ROLE_MODES.MAKER);
  const [selectedZone, setSelectedZone] = useState<ZoneContext>(attentionPreferences?.current_zone || ZONE_CONTEXTS.PEACETIME);

  const {
    roleFitScore,
    dailySuggestions,
    loading,
    applyOptimization,
    findOptimalTimeSlot,
  } = useRoleOptimizer({
    autoRefresh: true,
    includeWeeklyAnalysis: true,
  });

  const {
    currentScore,
    trend,
    breakdown,
  } = useRoleFitMonitor();

  // Demo timeline items for visualization
  const demoItems: Partial<TimelineItem>[] = [
    {
      id: 'demo-1',
      title: 'Deep Coding Session',
      duration_minutes: 180,
      attention_type: 'create',
      priority: 4,
      is_non_negotiable: false,
    },
    {
      id: 'demo-2',
      title: 'Strategic Planning',
      duration_minutes: 120,
      attention_type: 'decide',
      priority: 5,
      is_non_negotiable: true,
    },
    {
      id: 'demo-3',
      title: 'Team Standup',
      duration_minutes: 30,
      attention_type: 'connect',
      priority: 3,
      is_non_negotiable: false,
    },
    {
      id: 'demo-4',
      title: 'Code Review',
      duration_minutes: 90,
      attention_type: 'review',
      priority: 2,
      is_non_negotiable: false,
    },
  ];

  const handleRoleChange = async (newRole: RoleMode) => {
    setSelectedRole(newRole);
    if (attentionPreferences) {
      await updateAttentionPreferences({
        current_role: newRole,
      });
    }
  };

  const handleZoneChange = async (newZone: ZoneContext) => {
    setSelectedZone(newZone);
    if (attentionPreferences) {
      await updateAttentionPreferences({
        current_zone: newZone,
      });
    }
  };

  const roleDesc = ROLE_MODE_DESCRIPTIONS[selectedRole];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[selectedZone];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Role-Based Optimization System Demo
          </CardTitle>
          <CardDescription>
            Experience how AI-powered optimization transforms productivity based on your role and context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Role</label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLE_MODES).map((role) => {
                    const desc = ROLE_MODE_DESCRIPTIONS[role];
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: desc.color }}>{desc.icon}</span>
                          <span>{desc.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleDesc.description}</p>
            </div>

            {/* Zone Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Zone</label>
              <Select value={selectedZone} onValueChange={handleZoneChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ZONE_CONTEXTS).map((zone) => {
                    const desc = ZONE_CONTEXT_DESCRIPTIONS[zone];
                    return (
                      <SelectItem key={zone} value={zone}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: desc.color }}>{desc.icon}</span>
                          <span>{desc.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{zoneDesc.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Optimization Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Role Fit Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2" style={{
                color: currentScore && currentScore > 70 ? '#10b981' : currentScore && currentScore > 50 ? '#f59e0b' : '#ef4444'
              }}>
                {currentScore || 0}%
              </div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <TrendingUp className={`h-4 w-4 ${
                  trend === 'improving' ? 'text-green-500' :
                  trend === 'declining' ? 'text-red-500' :
                  'text-gray-400'
                }`} />
                <span className="text-sm text-muted-foreground capitalize">{trend}</span>
              </div>
              <Progress value={currentScore || 0} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {currentScore && currentScore > 80 ? 'Excellent alignment' :
                 currentScore && currentScore > 60 ? 'Good alignment' :
                 currentScore && currentScore > 40 ? 'Fair alignment' :
                 'Needs improvement'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Active Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {dailySuggestions.length}
              </div>
              <div className="space-y-1 mb-3">
                {dailySuggestions.slice(0, 2).map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {suggestion.type}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {dailySuggestions.length === 0 ? 'No optimizations needed' :
                 `${dailySuggestions.filter(s => s.priority === 'high').length} high priority`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Time Allocation</span>
                  <span>{breakdown.timeAllocation}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Energy Alignment</span>
                  <span>{breakdown.energyAlignment}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Context Switching</span>
                  <span>{breakdown.contextSwitching}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Attention Balance</span>
                  <span>{breakdown.attentionBalance}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                No timeline data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Showcase */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Smart Templates</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="delegation">Delegation</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Adaptive Templates</CardTitle>
              <CardDescription>
                Templates automatically adjust based on your {roleDesc.label} role and {zoneDesc.label} context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-3">Full Template Dialog</h4>
                  <RoleBasedTemplates
                    currentRole={selectedRole}
                    currentZone={selectedZone}
                    onTemplateSelect={(template) => {
                      console.log('Template selected:', template);
                    }}
                    onOptimizationApply={applyOptimization}
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-3">Compact Template Picker</h4>
                  <RoleBasedTemplatesCompact
                    currentRole={selectedRole}
                    currentZone={selectedZone}
                    onTemplateSelect={(template) => {
                      console.log('Template selected:', template);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Optimization</CardTitle>
              <CardDescription>
                Comprehensive analysis and actionable recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoleOptimizationPanel onOptimizationApply={applyOptimization} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Delegation</CardTitle>
              <CardDescription>
                Smart delegation recommendations based on role analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.duration_minutes}min • {item.attention_type}
                        {item.is_non_negotiable && (
                          <Badge variant="destructive" className="ml-2">Non-negotiable</Badge>
                        )}
                      </div>
                    </div>
                    <DelegationButton
                      item={item as TimelineItem}
                      onDelegate={(delegatedItem, delegateInfo) => {
                        console.log('Delegated:', delegatedItem, delegateInfo);
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span style={{ color: roleDesc.color }}>{roleDesc.icon}</span>
                  {roleDesc.label} Mode Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Optimization Focus</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                      {roleDesc.tips.map((tip, index) => (
                        <li key={index}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium">Preferred Activities</h4>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {roleDesc.behaviors.preferredAttentionTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span style={{ color: zoneDesc.color }}>{zoneDesc.icon}</span>
                  {zoneDesc.label} Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Behavioral Adjustments</h4>
                    <div className="space-y-1 mt-1 text-sm text-muted-foreground">
                      <div>Flexibility: {Math.round(zoneDesc.behaviors.flexibilityFactor * 100)}%</div>
                      <div>Interruption tolerance: {Math.round(zoneDesc.behaviors.interruptionTolerance * 100)}%</div>
                      <div>Meeting limit: {Math.round(zoneDesc.behaviors.meetingLimitMultiplier * 100)}%</div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium">Zone Strategies</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                      {zoneDesc.tips.slice(0, 3).map((tip, index) => (
                        <li key={index}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Optimization Example */}
          {dailySuggestions.length > 0 && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <strong>Live Optimization Active:</strong> {dailySuggestions.length} suggestions ready
                </div>
                <div className="mt-2 space-x-2">
                  {dailySuggestions.slice(0, 3).map((suggestion, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      onClick={() => applyOptimization(suggestion)}
                    >
                      Apply {suggestion.type}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Real-time Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Analyzing optimization...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Real-time optimization active</span>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {items.length} timeline items • {dailySuggestions.length} suggestions
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoleOptimizationDemo;