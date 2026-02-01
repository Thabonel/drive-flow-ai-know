import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Zap,
  AlertTriangle,
  Timer,
  Flame,
  Lock,
  Unlock,
  Target,
  Brain,
  BellOff,
  Calendar,
  Plus
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES, AttentionType } from '@/lib/attentionTypes';
import { useAdvancedAttentionBudget } from '@/hooks/useAdvancedAttentionBudget';

interface FocusBlock {
  item: TimelineItem;
  protectionLevel: 'minimal' | 'normal' | 'strict' | 'maximum';
  isProtected: boolean;
  recommendedBufferBefore: number;
  recommendedBufferAfter: number;
  threats: FocusThreat[];
  effectiveness: number;
}

interface FocusThreat {
  type: 'adjacent_meeting' | 'context_switch' | 'fragmentation' | 'interruption_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  threatItemId?: string;
}

interface FocusSession {
  id: string;
  itemId: string;
  startTime: string;
  duration: number;
  protectionLevel: string;
  isActive: boolean;
  interruptions: number;
  quality: number;
}

interface FocusProtectionSystemProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  onItemUpdate?: (itemId: string, updates: Partial<TimelineItem>) => void;
  onCreateBuffer?: (beforeItemId: string, duration: number) => void;
}

export function FocusProtectionSystem({
  items,
  selectedDate = new Date(),
  className,
  onItemUpdate,
  onCreateBuffer
}: FocusProtectionSystemProps) {
  const {
    preferences,
    startFocusSession,
    endFocusSession,
    focusSessions
  } = useAdvancedAttentionBudget();

  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [autoProtectionLevel, setAutoProtectionLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSession | null>(null);
  const [showProtectionDialog, setShowProtectionDialog] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<FocusBlock | null>(null);

  // Filter items for selected date and identify potential focus blocks
  const dayItems = useMemo(() => {
    const targetDate = selectedDate.toDateString();
    return items
      .filter(item => {
        const itemDate = new Date(item.start_time).toDateString();
        return itemDate === targetDate;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [items, selectedDate]);

  // Analyze focus blocks when items change
  useEffect(() => {
    analyzeFocusBlocks();
  }, [dayItems, preferences, protectionEnabled]);

  // Check for active focus sessions
  useEffect(() => {
    const activeSession = focusSessions.find(session =>
      !session.completedAt &&
      dayItems.some(item => item.id === session.timelineItemId)
    );

    if (activeSession) {
      const item = dayItems.find(item => item.id === activeSession.timelineItemId);
      if (item) {
        setActiveFocusSession({
          id: activeSession.id,
          itemId: item.id,
          startTime: item.start_time,
          duration: item.duration_minutes || 0,
          protectionLevel: activeSession.protectionLevel,
          isActive: true,
          interruptions: activeSession.interruptions,
          quality: activeSession.focusQualityScore || 0
        });
      }
    } else {
      setActiveFocusSession(null);
    }
  }, [focusSessions, dayItems]);

  const analyzeFocusBlocks = () => {
    if (!protectionEnabled || !preferences) {
      setFocusBlocks([]);
      return;
    }

    const blocks: FocusBlock[] = [];

    // Identify potential focus blocks (Create work >= 60 minutes)
    const focusItems = dayItems.filter(item =>
      item.attention_type === ATTENTION_TYPES.CREATE &&
      (item.duration_minutes || 0) >= 60
    );

    focusItems.forEach(item => {
      const block = createFocusBlock(item);
      blocks.push(block);
    });

    setFocusBlocks(blocks);
  };

  const createFocusBlock = (item: TimelineItem): FocusBlock => {
    const duration = item.duration_minutes || 0;

    // Determine protection level based on duration and user preferences
    let protectionLevel: FocusBlock['protectionLevel'] = 'normal';
    if (duration >= 180) protectionLevel = 'maximum';
    else if (duration >= 120) protectionLevel = 'strict';
    else if (duration >= 90) protectionLevel = 'normal';
    else protectionLevel = 'minimal';

    // Calculate recommended buffers
    const bufferMap = {
      minimal: { before: 5, after: 5 },
      normal: { before: 15, after: 10 },
      strict: { before: 20, after: 15 },
      maximum: { before: 30, after: 30 }
    };
    const buffers = bufferMap[protectionLevel];

    // Analyze threats
    const threats = analyzeFocusThreats(item);

    // Calculate effectiveness (0-100)
    const effectiveness = calculateFocusEffectiveness(item, threats);

    return {
      item,
      protectionLevel,
      isProtected: item.is_non_negotiable || false,
      recommendedBufferBefore: buffers.before,
      recommendedBufferAfter: buffers.after,
      threats,
      effectiveness
    };
  };

  const analyzeFocusThreats = (focusItem: TimelineItem): FocusThreat[] => {
    const threats: FocusThreat[] = [];
    const focusStart = new Date(focusItem.start_time);
    const focusEnd = new Date(focusStart.getTime() + (focusItem.duration_minutes || 0) * 60000);

    // Check for adjacent meetings
    dayItems.forEach(item => {
      if (item.id === focusItem.id) return;

      const itemStart = new Date(item.start_time);
      const itemEnd = new Date(itemStart.getTime() + (item.duration_minutes || 0) * 60000);

      // Meeting immediately before
      const gapBefore = (focusStart.getTime() - itemEnd.getTime()) / (1000 * 60);
      if (gapBefore >= 0 && gapBefore < 30 && item.attention_type === ATTENTION_TYPES.CONNECT) {
        threats.push({
          type: 'adjacent_meeting',
          severity: gapBefore < 10 ? 'critical' : gapBefore < 20 ? 'high' : 'medium',
          description: `Meeting ends ${Math.round(gapBefore)}m before focus block`,
          suggestion: 'Add buffer time to decompress from social interaction',
          threatItemId: item.id
        });
      }

      // Meeting immediately after
      const gapAfter = (itemStart.getTime() - focusEnd.getTime()) / (1000 * 60);
      if (gapAfter >= 0 && gapAfter < 30 && item.attention_type === ATTENTION_TYPES.CONNECT) {
        threats.push({
          type: 'adjacent_meeting',
          severity: gapAfter < 10 ? 'critical' : gapAfter < 20 ? 'high' : 'medium',
          description: `Meeting starts ${Math.round(gapAfter)}m after focus block`,
          suggestion: 'Add buffer time to avoid rushing',
          threatItemId: item.id
        });
      }

      // Context switch threats
      if (gapBefore >= 0 && gapBefore < 60 &&
          item.attention_type && item.attention_type !== ATTENTION_TYPES.CREATE) {
        threats.push({
          type: 'context_switch',
          severity: 'medium',
          description: `Context switch from ${item.attention_type} to creative work`,
          suggestion: 'Consider grouping similar work types together',
          threatItemId: item.id
        });
      }
    });

    // Check for fragmentation (short duration)
    if ((focusItem.duration_minutes || 0) < 90) {
      threats.push({
        type: 'fragmentation',
        severity: 'medium',
        description: 'Focus block shorter than optimal 90+ minutes',
        suggestion: 'Consider extending duration or combining with adjacent time'
      });
    }

    // Check for peak hours optimization
    const focusHour = focusStart.getHours();
    const peakStart = preferences ? parseInt(preferences.peak_hours_start?.split(':')[0] || '9') : 9;
    const peakEnd = preferences ? parseInt(preferences.peak_hours_end?.split(':')[0] || '12') : 12;

    if (focusHour < peakStart || focusHour > peakEnd) {
      threats.push({
        type: 'interruption_risk',
        severity: 'low',
        description: 'Focus work outside peak attention hours',
        suggestion: `Consider moving to peak hours (${preferences?.peak_hours_start}-${preferences?.peak_hours_end})`
      });
    }

    return threats;
  };

  const calculateFocusEffectiveness = (item: TimelineItem, threats: FocusThreat[]): number => {
    let score = 100;

    // Penalize based on threats
    threats.forEach(threat => {
      switch (threat.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Bonus for optimal duration
    const duration = item.duration_minutes || 0;
    if (duration >= 120) score += 10;
    if (duration >= 180) score += 5;

    // Bonus for protection
    if (item.is_non_negotiable) score += 15;

    return Math.max(0, Math.min(100, score));
  };

  const getProtectionIcon = (level: FocusBlock['protectionLevel']) => {
    switch (level) {
      case 'maximum': return <Shield className="h-4 w-4 text-green-600" />;
      case 'strict': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'normal': return <Shield className="h-4 w-4 text-yellow-600" />;
      case 'minimal': return <ShieldAlert className="h-4 w-4 text-orange-600" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: FocusThreat['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleProtectBlock = async (block: FocusBlock) => {
    try {
      if (onItemUpdate) {
        onItemUpdate(block.item.id, {
          is_non_negotiable: true,
          priority: 5
        });
      }

      // Start focus session
      await startFocusSession(
        block.item.id,
        'deep_work',
        block.protectionLevel
      );

    } catch (error) {
      console.error('Error protecting focus block:', error);
    }
  };

  const handleCreateBuffer = (block: FocusBlock, position: 'before' | 'after') => {
    if (!onCreateBuffer) return;

    const duration = position === 'before' ?
      block.recommendedBufferBefore :
      block.recommendedBufferAfter;

    onCreateBuffer(block.item.id, duration);
  };

  const handleEndFocusSession = async () => {
    if (!activeFocusSession) return;

    try {
      await endFocusSession(activeFocusSession.id, {
        completionRating: 5, // This would come from user input
        interruptions: activeFocusSession.interruptions,
        notes: 'Focus session completed'
      });
      setActiveFocusSession(null);
    } catch (error) {
      console.error('Error ending focus session:', error);
    }
  };

  if (!protectionEnabled) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Focus Protection System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Focus protection is disabled
          </p>
          <Button
            size="sm"
            onClick={() => setProtectionEnabled(true)}
            className="mt-2"
          >
            Enable Protection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Focus Protection System
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {focusBlocks.length} blocks
              </Badge>
              <Switch
                checked={protectionEnabled}
                onCheckedChange={setProtectionEnabled}
                size="sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Focus Session */}
          {activeFocusSession && (
            <Alert className="border-orange-200 bg-orange-50">
              <Flame className="h-4 w-4 text-orange-500" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Active Focus Session</div>
                    <div className="text-sm text-muted-foreground">
                      Protection: {activeFocusSession.protectionLevel} •
                      {activeFocusSession.duration}m planned
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BellOff className="h-4 w-4 text-orange-500" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEndFocusSession}
                    >
                      End Session
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Protection Settings */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto-Protection Level</span>
            <Select value={autoProtectionLevel} onValueChange={(value: any) => setAutoProtectionLevel(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Focus Blocks */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Focus Blocks Today</h4>

            {focusBlocks.length === 0 ? (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No focus blocks detected for {selectedDate.toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Create 60+ minute blocks for creative work
                </p>
              </div>
            ) : (
              focusBlocks.map((block) => (
                <Card key={block.item.id} className={`border ${
                  block.isProtected ? 'border-green-200 bg-green-50' :
                  block.effectiveness < 60 ? 'border-red-200 bg-red-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <CardContent className="p-3 space-y-3">
                    {/* Block Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getProtectionIcon(block.protectionLevel)}
                        <div>
                          <div className="font-medium text-sm">{block.item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(block.item.start_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {block.item.duration_minutes}m
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          block.effectiveness >= 80 ? 'default' :
                          block.effectiveness >= 60 ? 'secondary' : 'destructive'
                        } className="text-xs">
                          {block.effectiveness}%
                        </Badge>
                        {block.isProtected ? (
                          <Lock className="h-4 w-4 text-green-600" />
                        ) : (
                          <Unlock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Threats */}
                    {block.threats.length > 0 && (
                      <div className="space-y-1">
                        {block.threats.slice(0, 2).map((threat, index) => (
                          <div
                            key={index}
                            className={`text-xs p-2 rounded border ${getSeverityColor(threat.severity)}`}
                          >
                            <div className="font-medium">{threat.description}</div>
                            <div className="text-muted-foreground">💡 {threat.suggestion}</div>
                          </div>
                        ))}
                        {block.threats.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{block.threats.length - 2} more threats
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!block.isProtected && (
                        <Button
                          size="sm"
                          onClick={() => handleProtectBlock(block)}
                          className="text-xs"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Protect
                        </Button>
                      )}

                      {block.threats.some(t => t.type === 'adjacent_meeting') && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Buffer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Buffer Time</DialogTitle>
                              <DialogDescription>
                                Add buffer time to protect your focus block from interruptions
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    handleCreateBuffer(block, 'before');
                                    setShowProtectionDialog(false);
                                  }}
                                  className="text-sm"
                                >
                                  <Timer className="h-4 w-4 mr-2" />
                                  {block.recommendedBufferBefore}m Before
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    handleCreateBuffer(block, 'after');
                                    setShowProtectionDialog(false);
                                  }}
                                  className="text-sm"
                                >
                                  <Timer className="h-4 w-4 mr-2" />
                                  {block.recommendedBufferAfter}m After
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBlock(block);
                              setShowProtectionDialog(true);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Brain className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View detailed analysis</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary Stats */}
          {focusBlocks.length > 0 && (
            <div className="border-t pt-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">
                    {focusBlocks.filter(b => b.isProtected).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Protected</div>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {Math.round(
                      focusBlocks.reduce((sum, b) => sum + b.effectiveness, 0) / focusBlocks.length
                    )}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Effectiveness</div>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {focusBlocks.reduce((sum, b) => sum + b.threats.length, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Threats</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Detailed Analysis Dialog */}
        <Dialog open={showProtectionDialog} onOpenChange={setShowProtectionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Focus Block Analysis</DialogTitle>
              {selectedBlock && (
                <DialogDescription>
                  Detailed protection analysis for "{selectedBlock.item.title}"
                </DialogDescription>
              )}
            </DialogHeader>
            {selectedBlock && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Protection Details</h4>
                    <div className="space-y-1 text-sm">
                      <div>Level: {selectedBlock.protectionLevel}</div>
                      <div>Duration: {selectedBlock.item.duration_minutes}m</div>
                      <div>Effectiveness: {selectedBlock.effectiveness}%</div>
                      <div>
                        Buffer: {selectedBlock.recommendedBufferBefore}m / {selectedBlock.recommendedBufferAfter}m
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Threat Analysis</h4>
                    <div className="space-y-1">
                      {selectedBlock.threats.map((threat, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-xs ${getSeverityColor(threat.severity)}`}
                        >
                          <div className="font-medium">{threat.type}</div>
                          <div>{threat.description}</div>
                          <div className="italic mt-1">💡 {threat.suggestion}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProtectionDialog(false)}>
                Close
              </Button>
              {selectedBlock && !selectedBlock.isProtected && (
                <Button onClick={() => {
                  handleProtectBlock(selectedBlock);
                  setShowProtectionDialog(false);
                }}>
                  <Shield className="h-4 w-4 mr-2" />
                  Activate Protection
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
}