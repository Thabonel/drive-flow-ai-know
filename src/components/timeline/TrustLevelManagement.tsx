// Trust Level Management System for Delegation Workflow
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowUp,
  ArrowDown,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTrustLevelData } from '@/hooks/useTrustLevelData';
import { TrustLevel, TRUST_LEVEL_DESCRIPTIONS } from '@/lib/attentionTypes';
import { toast } from 'sonner';

interface TrustLevelHistory {
  id: string;
  team_member_id: string;
  member_name: string;
  current_trust_level: TrustLevel;
  suggested_trust_level?: TrustLevel;
  success_rate: number;
  completed_delegations: number;
  average_rating: number;
  avg_completion_time_hours: number;
  skills: string[];
  performance_trend: 'improving' | 'stable' | 'declining';
  last_delegation_date?: string;
  progression_recommendations: string[];
  trust_level_changes: {
    date: string;
    from_level: TrustLevel;
    to_level: TrustLevel;
    reason: string;
  }[];
}

interface TrustLevelSuggestion {
  member_id: string;
  member_name: string;
  current_level: TrustLevel;
  suggested_level: TrustLevel;
  confidence: number;
  reasons: string[];
  supporting_data: {
    success_rate: number;
    avg_rating: number;
    completion_time_improvement: number;
    consistency_score: number;
  };
}

export function TrustLevelManagement() {
  const { team } = useTeam();
  const { members } = useTeamMembers(team?.id);
  const { trustLevelData, updateTrustLevel, getTrustLevelSuggestions } = useTrustLevelData(team?.id);

  const [selectedMember, setSelectedMember] = useState<TrustLevelHistory | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TrustLevelSuggestion[]>([]);

  useEffect(() => {
    if (team?.id) {
      loadSuggestions();
    }
  }, [team?.id]);

  const loadSuggestions = async () => {
    try {
      const data = await getTrustLevelSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load trust level suggestions:', error);
    }
  };

  const getTrustLevelConfig = (level: TrustLevel) => {
    return TRUST_LEVEL_DESCRIPTIONS[level];
  };

  const getTrustLevelProgress = (level: TrustLevel) => {
    const levels = { new: 33, experienced: 66, expert: 100 };
    return levels[level] || 0;
  };

  const getPerformanceTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <ArrowUp className="h-4 w-4 text-gray-600 rotate-90" />;
    }
  };

  const getPerformanceColor = (successRate: number) => {
    if (successRate >= 90) return 'text-green-600';
    if (successRate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleUpdateTrustLevel = async (
    memberId: string,
    newLevel: TrustLevel,
    reason: string
  ) => {
    try {
      await updateTrustLevel(memberId, newLevel, reason);
      toast.success('Trust level updated successfully');
      setIsUpdateModalOpen(false);
      setSelectedMember(null);
      loadSuggestions(); // Refresh suggestions
    } catch (error) {
      toast.error('Failed to update trust level');
    }
  };

  const getReadinessScore = (member: TrustLevelHistory): number => {
    const weights = {
      successRate: 0.4,
      avgRating: 0.3,
      completionTime: 0.2,
      consistency: 0.1
    };

    const successScore = Math.min(member.success_rate / 90, 1) * 100;
    const ratingScore = Math.min(member.average_rating / 4.5, 1) * 100;
    const timeScore = member.avg_completion_time_hours
      ? Math.max(1 - (member.avg_completion_time_hours / 40), 0) * 100  // Normalize against 40 hours
      : 0;
    const trendScore = member.performance_trend === 'improving' ? 100 :
                      member.performance_trend === 'stable' ? 75 : 25;

    return Math.round(
      successScore * weights.successRate +
      ratingScore * weights.avgRating +
      timeScore * weights.completionTime +
      trendScore * weights.consistency
    );
  };

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trust Level Management</CardTitle>
          <CardDescription>Join a team to manage trust levels for delegation</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trust Level Management</h2>
          <p className="text-gray-600">Track and optimize delegation trust levels for your team</p>
        </div>
        <Button onClick={loadSuggestions}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh Suggestions
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="suggestions">
            AI Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Trust Level History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Team Trust Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Level Distribution</CardTitle>
              <CardDescription>Current trust levels across your team</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const distribution = trustLevelData?.reduce((acc, member) => {
                  acc[member.current_trust_level] = (acc[member.current_trust_level] || 0) + 1;
                  return acc;
                }, {} as Record<TrustLevel, number>) || {};

                const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

                return (
                  <div className="grid grid-cols-3 gap-4">
                    {(['new', 'experienced', 'expert'] as TrustLevel[]).map(level => {
                      const count = distribution[level] || 0;
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const config = getTrustLevelConfig(level);

                      return (
                        <div key={level} className="text-center p-4 border rounded-lg">
                          <div className="text-2xl mb-2">{config.icon}</div>
                          <h4 className="font-medium capitalize">{level}</h4>
                          <div className="text-2xl font-bold mt-2">{count}</div>
                          <div className="text-sm text-gray-500">
                            {percentage.toFixed(0)}% of team
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Individual Team Members */}
          <div className="grid gap-4">
            {trustLevelData?.map((member) => {
              const config = getTrustLevelConfig(member.current_trust_level);
              const readinessScore = getReadinessScore(member);

              return (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-lg">{member.member_name}</h4>
                          <Badge className={`bg-${config.color.slice(1)} text-white`}>
                            {config.icon} {config.label}
                          </Badge>
                          {member.suggested_trust_level &&
                           member.suggested_trust_level !== member.current_trust_level && (
                            <Badge variant="outline" className="animate-pulse">
                              Suggested: {TRUST_LEVEL_DESCRIPTIONS[member.suggested_trust_level].label}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Success Rate</p>
                            <p className={`font-medium ${getPerformanceColor(member.success_rate)}`}>
                              {member.success_rate.toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Rating</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <p className="font-medium">{member.average_rating.toFixed(1)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="font-medium">{member.completed_delegations} tasks</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-600">Trend</p>
                            {getPerformanceTrendIcon(member.performance_trend)}
                          </div>
                        </div>

                        {/* Trust Level Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Trust Level Progress</span>
                            <span>{readinessScore}% readiness</span>
                          </div>
                          <Progress value={readinessScore} className="h-2" />
                        </div>

                        {/* Skills */}
                        {member.skills.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {member.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {member.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Recommendations */}
                        {member.progression_recommendations.length > 0 && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800 font-medium mb-1">
                              Growth Recommendations:
                            </p>
                            <ul className="text-sm text-blue-700 list-disc list-inside">
                              {member.progression_recommendations.slice(0, 2).map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsUpdateModalOpen(true);
                        }}
                      >
                        Update Level
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions available</h3>
                <p className="text-gray-600">
                  All team members are at optimal trust levels based on their current performance.
                </p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => {
              const currentConfig = getTrustLevelConfig(suggestion.current_level);
              const suggestedConfig = getTrustLevelConfig(suggestion.suggested_level);
              const isPromotion = suggestion.suggested_level !== suggestion.current_level;

              return (
                <Card key={suggestion.member_id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-medium text-lg">{suggestion.member_name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`bg-${currentConfig.color.slice(1)} text-white`}>
                              {currentConfig.label}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <Badge className={`bg-${suggestedConfig.color.slice(1)} text-white`}>
                              {suggestedConfig.label}
                            </Badge>
                          </div>
                          <Badge variant="outline">
                            {suggestion.confidence}% confidence
                          </Badge>
                        </div>

                        {/* Supporting Data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600">Success Rate</p>
                            <p className="font-medium">{suggestion.supporting_data.success_rate.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Avg Rating</p>
                            <p className="font-medium">{suggestion.supporting_data.avg_rating.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Time Improvement</p>
                            <p className="font-medium text-green-600">
                              {suggestion.supporting_data.completion_time_improvement > 0 ? '+' : ''}
                              {suggestion.supporting_data.completion_time_improvement.toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Consistency</p>
                            <p className="font-medium">{suggestion.supporting_data.consistency_score.toFixed(0)}%</p>
                          </div>
                        </div>

                        {/* Reasons */}
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">Why this change is recommended:</p>
                          <ul className="space-y-1">
                            {suggestion.reasons.map((reason, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleUpdateTrustLevel(
                            suggestion.member_id,
                            suggestion.suggested_level,
                            `AI suggestion based on performance: ${suggestion.reasons.join(', ')}`
                          )}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Apply Suggestion
                        </Button>
                        <Button variant="outline" size="sm">
                          Skip
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trust Level Change History</CardTitle>
              <CardDescription>Track how trust levels have evolved over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trustLevelData?.flatMap(member =>
                  member.trust_level_changes.map(change => ({
                    ...change,
                    member_name: member.member_name,
                    member_id: member.id
                  }))
                ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{change.member_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(change.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {TRUST_LEVEL_DESCRIPTIONS[change.from_level].label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline">
                          {TRUST_LEVEL_DESCRIPTIONS[change.to_level].label}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 max-w-md">
                      {change.reason}
                    </p>
                  </div>
                )) || []}

                {(!trustLevelData || trustLevelData.every(m => m.trust_level_changes.length === 0)) && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
                    <p className="text-gray-600">
                      Trust level changes will appear here as you update team member levels.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trust Level Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Trust Level</DialogTitle>
            <DialogDescription>
              Change trust level for {selectedMember?.member_name}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <TrustLevelUpdateForm
              member={selectedMember}
              onUpdate={handleUpdateTrustLevel}
              onCancel={() => setIsUpdateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Trust Level Update Form Component
interface TrustLevelUpdateFormProps {
  member: TrustLevelHistory;
  onUpdate: (memberId: string, newLevel: TrustLevel, reason: string) => void;
  onCancel: () => void;
}

function TrustLevelUpdateForm({ member, onUpdate, onCancel }: TrustLevelUpdateFormProps) {
  const [newLevel, setNewLevel] = useState<TrustLevel>(member.current_trust_level);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (newLevel !== member.current_trust_level && reason.trim()) {
      onUpdate(member.team_member_id, newLevel, reason);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Current Trust Level</Label>
        <div className="flex items-center gap-2">
          <Badge className={`bg-${TRUST_LEVEL_DESCRIPTIONS[member.current_trust_level].color.slice(1)} text-white`}>
            {TRUST_LEVEL_DESCRIPTIONS[member.current_trust_level].label}
          </Badge>
          <span className="text-sm text-gray-600">
            {TRUST_LEVEL_DESCRIPTIONS[member.current_trust_level].description}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>New Trust Level</Label>
        <div className="space-y-2">
          {(['new', 'experienced', 'expert'] as TrustLevel[]).map(level => {
            const config = getTrustLevelConfig(level);
            return (
              <label key={level} className="flex items-center space-x-3">
                <input
                  type="radio"
                  value={level}
                  checked={newLevel === level}
                  onChange={(e) => setNewLevel(e.target.value as TrustLevel)}
                  className="form-radio"
                />
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Change</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why you're changing this team member's trust level..."
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={newLevel === member.current_trust_level || !reason.trim()}
          className="flex-1"
        >
          Update Trust Level
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}