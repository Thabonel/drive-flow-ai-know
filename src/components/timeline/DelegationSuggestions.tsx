import React, { useState, useCallback } from 'react';
import { useSupabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  UserPlus,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Users,
  Bot,
  Zap
} from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  duration_minutes: number;
  attention_type?: string;
  priority?: number;
  is_non_negotiable?: boolean;
  layer_name?: string;
}

interface DelegationRecommendation {
  item_id: string;
  should_delegate: boolean;
  confidence_score: number;
  reasons: string[];
  recommended_delegates: {
    team_member_id: string;
    name: string;
    trust_level: 'new' | 'experienced' | 'expert';
    fit_score: number;
    reason: string;
    estimated_time_savings: number;
  }[];
  delegation_strategy: {
    handoff_method: 'work_alongside' | 'checkpoint_reviews' | 'provide_context_only';
    follow_up_schedule: string[];
    success_factors: string[];
    risk_mitigation: string[];
  };
  automation_alternative?: {
    possible: boolean;
    tools_suggested: string[];
    implementation_complexity: 'low' | 'medium' | 'high';
  };
}

interface WeeklyDelegationScan {
  total_items_analyzed: number;
  delegation_opportunities: number;
  time_savings_potential: number;
  recommendations: DelegationRecommendation[];
  recurring_patterns: {
    pattern: string;
    frequency: number;
    delegation_suggestion: string;
  }[];
  role_alignment_score: number;
}

interface DelegationSuggestionsProps {
  timelineItems: TimelineItem[];
  userRole: 'maker' | 'marker' | 'multiplier';
  onDelegateItem: (itemId: string, delegateInfo: any) => void;
}

const DelegationSuggestions: React.FC<DelegationSuggestionsProps> = ({
  timelineItems,
  userRole,
  onDelegateItem
}) => {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [weeklyScan, setWeeklyScan] = useState<WeeklyDelegationScan | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [singleAnalysis, setSingleAnalysis] = useState<DelegationRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runWeeklyScan = useCallback(async () => {
    if (!user || timelineItems.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-delegation-analyzer', {
        body: {
          allUserItems: timelineItems,
          userRole,
          analysisType: 'weekly_scan'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze delegation opportunities');
      }

      setWeeklyScan(data.result);

    } catch (error) {
      console.error('Weekly delegation scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan for delegation opportunities');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, timelineItems, userRole, supabase]);

  const analyzeSingleItem = useCallback(async (item: TimelineItem) => {
    if (!user) return;

    setIsAnalyzing(true);
    setError(null);
    setSelectedItem(item);

    try {
      const { data, error } = await supabase.functions.invoke('ai-delegation-analyzer', {
        body: {
          timelineItem: item,
          userRole,
          analysisType: 'single_item'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze item for delegation');
      }

      setSingleAnalysis(data.result);

    } catch (error) {
      console.error('Single item analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze item');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, userRole, supabase]);

  const quickJobCheck = useCallback(async (item: TimelineItem) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('ai-delegation-analyzer', {
        body: {
          timelineItem: item,
          userRole,
          analysisType: 'is_this_my_job'
        }
      });

      if (error) throw new Error(error.message);

      const result = data.result;
      const actionText = result.action === 'delegate' ? 'Should delegate' :
                        result.action === 'decline' ? 'Should decline' :
                        result.action === 'automate' ? 'Could automate' :
                        'Should handle yourself';

      alert(`${actionText}\n\nReason: ${result.quick_reason}\n\nConfidence: ${result.confidence}%\n\nSuggestion: ${result.alternative_suggestion || 'Handle as planned'}`);

    } catch (error) {
      console.error('Quick job check error:', error);
      alert('Failed to analyze item. Please try again.');
    }
  }, [user, userRole, supabase]);

  const handleDelegate = useCallback((recommendation: DelegationRecommendation, delegateInfo: any) => {
    onDelegateItem(recommendation.item_id, delegateInfo);
    setSingleAnalysis(null);
    setSelectedItem(null);
  }, [onDelegateItem]);

  const getTrustLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-green-100 text-green-800 border-green-200';
      case 'experienced': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'new': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getRoleAlignmentColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" />
            AI Delegation Assistant
          </CardTitle>
          <CardDescription>
            Get intelligent suggestions for delegating tasks based on your {userRole} role and team capacity.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={runWeeklyScan}
              disabled={isAnalyzing || timelineItems.length === 0}
              className="h-20 flex flex-col items-center gap-2"
              variant="outline"
            >
              <Users className="h-5 w-5" />
              <span>Scan Week for Delegation</span>
              <span className="text-xs text-muted-foreground">
                {timelineItems.length} items to analyze
              </span>
            </Button>

            <Button
              onClick={() => quickJobCheck(timelineItems[0])}
              disabled={isAnalyzing || timelineItems.length === 0}
              className="h-20 flex flex-col items-center gap-2"
              variant="outline"
            >
              <AlertCircle className="h-5 w-5" />
              <span>Is This My Job?</span>
              <span className="text-xs text-muted-foreground">
                Quick triage for current task
              </span>
            </Button>
          </div>

          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Weekly Scan Results */}
      {weeklyScan && (
        <Card className="shadow-neu-raised rounded-2xl">
          <CardHeader>
            <CardTitle>Weekly Delegation Scan Results</CardTitle>
            <CardDescription>
              AI found {weeklyScan.delegation_opportunities} delegation opportunities
              that could save {formatTime(weeklyScan.time_savings_potential)}.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {weeklyScan.delegation_opportunities}
                  </div>
                  <div className="text-sm text-blue-600">Delegation Opportunities</div>
                </div>

                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatTime(weeklyScan.time_savings_potential)}
                  </div>
                  <div className="text-sm text-green-600">Time Savings Potential</div>
                </div>

                <div className={`p-4 rounded-xl text-center ${getRoleAlignmentColor(weeklyScan.role_alignment_score)}`}>
                  <div className="text-2xl font-bold">
                    {weeklyScan.role_alignment_score}%
                  </div>
                  <div className="text-sm">Role Alignment Score</div>
                </div>
              </div>

              {/* Delegation Recommendations */}
              {weeklyScan.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Delegation Recommendations</h4>
                  <div className="space-y-3">
                    {weeklyScan.recommendations.map((rec, index) => {
                      const item = timelineItems.find(item => item.id === rec.item_id);
                      if (!item) return null;

                      return (
                        <div key={index} className="p-4 border rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatTime(item.duration_minutes)} • {item.attention_type}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={`${getConfidenceColor(rec.confidence_score)}`}
                              >
                                {rec.confidence_score}% confidence
                              </Badge>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedItem(item)}
                                  >
                                    Delegate
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Delegate: {item.title}</DialogTitle>
                                    <DialogDescription>
                                      AI analysis and delegation recommendations for this task.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DelegationAnalysisDialog
                                    item={item}
                                    recommendation={rec}
                                    onDelegate={handleDelegate}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {rec.reasons.slice(0, 2).join(' • ')}
                          </div>

                          {rec.recommended_delegates.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm">Best delegate:</span>
                              <Badge
                                variant="outline"
                                className={getTrustLevelColor(rec.recommended_delegates[0].trust_level)}
                              >
                                {rec.recommended_delegates[0].name} ({rec.recommended_delegates[0].trust_level})
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recurring Patterns */}
              {weeklyScan.recurring_patterns.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Recurring Patterns to Optimize</h4>
                  <div className="space-y-2">
                    {weeklyScan.recurring_patterns.map((pattern, index) => (
                      <div key={index} className="p-3 bg-muted rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{pattern.pattern}</div>
                            <div className="text-sm text-muted-foreground">
                              Occurs {pattern.frequency}x per week
                            </div>
                          </div>
                          <div className="text-sm text-right max-w-xs">
                            {pattern.delegation_suggestion}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Item Analysis */}
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle>Individual Task Analysis</CardTitle>
          <CardDescription>
            Click on any timeline item to get instant delegation analysis.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timelineItems.slice(0, 9).map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded-xl hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => analyzeSingleItem(item)}
              >
                <div className="font-medium text-sm mb-1 truncate">
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(item.duration_minutes)} • {item.attention_type || 'untyped'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">
                    Priority {item.priority || 'none'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          {timelineItems.length > 9 && (
            <div className="text-center mt-4">
              <Button variant="ghost" onClick={runWeeklyScan}>
                Analyze All {timelineItems.length} Items
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Delegation Analysis Dialog Component
interface DelegationAnalysisDialogProps {
  item: TimelineItem;
  recommendation: DelegationRecommendation;
  onDelegate: (recommendation: DelegationRecommendation, delegateInfo: any) => void;
}

const DelegationAnalysisDialog: React.FC<DelegationAnalysisDialogProps> = ({
  item,
  recommendation,
  onDelegate
}) => {
  const [selectedDelegate, setSelectedDelegate] = useState(
    recommendation.recommended_delegates[0] || null
  );

  const getTrustLevelDescription = (level: string) => {
    switch (level) {
      case 'expert': return 'High trust - needs only initial context and final review';
      case 'experienced': return 'Proven track record - checkpoint reviews at 25% and 75%';
      case 'new': return 'First delegation - work alongside approach needed';
      default: return 'Unknown trust level';
    }
  };

  const handleDelegateNow = () => {
    if (!selectedDelegate) return;

    onDelegate(recommendation, {
      delegate_id: selectedDelegate.team_member_id,
      trust_level: selectedDelegate.trust_level,
      handoff_method: recommendation.delegation_strategy.handoff_method,
      follow_up_schedule: recommendation.delegation_strategy.follow_up_schedule
    });
  };

  if (!recommendation.should_delegate) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            AI recommends keeping this task yourself. Confidence: {recommendation.confidence_score}%
          </AlertDescription>
        </Alert>

        <div>
          <h4 className="font-semibold mb-2">Reasons to Keep:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {recommendation.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>

        {recommendation.automation_alternative?.possible && (
          <div>
            <h4 className="font-semibold mb-2">Automation Alternative:</h4>
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Could be automated ({recommendation.automation_alternative.implementation_complexity} complexity)
                </span>
              </div>
              <div className="text-sm text-blue-700">
                Tools: {recommendation.automation_alternative.tools_suggested.join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delegation Confidence */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Should delegate</strong> - Confidence: {recommendation.confidence_score}%
        </AlertDescription>
      </Alert>

      {/* Reasons */}
      <div>
        <h4 className="font-semibold mb-2">Why Delegate:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {recommendation.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Recommended Delegates */}
      <div>
        <h4 className="font-semibold mb-3">Recommended Team Members:</h4>
        <div className="space-y-3">
          {recommendation.recommended_delegates.map((delegate, index) => (
            <div
              key={index}
              className={`p-3 border rounded-xl cursor-pointer transition-colors ${
                selectedDelegate?.team_member_id === delegate.team_member_id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedDelegate(delegate)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {delegate.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{delegate.name}</div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        delegate.trust_level === 'expert' ? 'border-green-200 text-green-700' :
                        delegate.trust_level === 'experienced' ? 'border-blue-200 text-blue-700' :
                        'border-yellow-200 text-yellow-700'
                      }`}
                    >
                      {delegate.trust_level}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{delegate.fit_score}% fit</div>
                  <div className="text-xs text-muted-foreground">
                    Saves {delegate.estimated_time_savings}min
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {delegate.reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delegation Strategy */}
      {selectedDelegate && (
        <div>
          <h4 className="font-semibold mb-2">Delegation Strategy:</h4>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="font-medium text-blue-800 mb-1">Handoff Method</div>
              <div className="text-sm text-blue-700">
                {getTrustLevelDescription(selectedDelegate.trust_level)}
              </div>
            </div>

            {recommendation.delegation_strategy.follow_up_schedule.length > 0 && (
              <div className="p-3 bg-orange-50 rounded-xl">
                <div className="font-medium text-orange-800 mb-1">Follow-up Schedule</div>
                <ul className="text-sm text-orange-700 space-y-1">
                  {recommendation.delegation_strategy.follow_up_schedule.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-xl">
                <div className="font-medium text-green-800 mb-1">Success Factors</div>
                <ul className="text-sm text-green-700 space-y-1">
                  {recommendation.delegation_strategy.success_factors.slice(0, 3).map((factor, index) => (
                    <li key={index}>• {factor}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-red-50 rounded-xl">
                <div className="font-medium text-red-800 mb-1">Risk Mitigation</div>
                <ul className="text-sm text-red-700 space-y-1">
                  {recommendation.delegation_strategy.risk_mitigation.slice(0, 3).map((risk, index) => (
                    <li key={index}>• {risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <Separator />
      <div className="flex gap-3">
        <Button
          onClick={handleDelegateNow}
          disabled={!selectedDelegate}
          className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Delegate to {selectedDelegate?.name || 'Team Member'}
        </Button>

        <Button variant="outline" className="flex-1">
          Save for Later
        </Button>
      </div>
    </div>
  );
};

export default DelegationSuggestions;