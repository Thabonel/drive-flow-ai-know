// Dashboard for Multiplier mode showing delegation opportunities and team enablement
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES, ROLE_MODES } from '@/lib/attentionTypes';
import { MultiplierModeBehaviors } from '@/lib/roleBasedBehaviors';
import {
  Users,
  ArrowRight,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface MultiplierDashboardProps {
  items: TimelineItem[];
  currentDate: Date;
  currentRole?: string;
  compact?: boolean;
}

interface DelegationMetrics {
  totalCreateTime: number;
  totalConnectTime: number;
  delegationOpportunities: TimelineItem[];
  roleCompatibilityScore: number;
  recommendations: string[];
}

export function MultiplierDashboard({
  items,
  currentDate,
  currentRole,
  compact = false
}: MultiplierDashboardProps) {
  // Only show for Multiplier mode
  if (currentRole !== ROLE_MODES.MULTIPLIER) {
    return null;
  }

  // Filter items for the current date
  const todaysItems = items.filter(item =>
    new Date(item.start_time).toDateString() === currentDate.toDateString()
  );

  const metrics = useMemo(() => calculateMultiplierMetrics(todaysItems), [todaysItems]);

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Multiplier</span>
            <Badge variant={metrics.roleCompatibilityScore >= 70 ? "default" : "destructive"} className="text-xs">
              {metrics.roleCompatibilityScore}%
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <MultiplierDashboardContent metrics={metrics} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Multiplier Mode Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MultiplierDashboardContent metrics={metrics} />
      </CardContent>
    </Card>
  );
}

function MultiplierDashboardContent({ metrics }: { metrics: DelegationMetrics }) {
  const {
    totalCreateTime,
    totalConnectTime,
    delegationOpportunities,
    roleCompatibilityScore,
    recommendations
  } = metrics;

  // Calculate status levels
  const createTimeStatus = totalCreateTime <= MultiplierModeBehaviors.MAX_PERSONAL_CREATE_TIME ? 'good' : 'warning';
  const connectTimeStatus = totalConnectTime >= MultiplierModeBehaviors.MIN_DAILY_CONNECT_TIME ? 'good' : 'warning';

  return (
    <div className="space-y-4">
      {/* Role compatibility score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Multiplier Effectiveness</span>
          <Badge variant={roleCompatibilityScore >= 70 ? "default" : "destructive"}>
            {roleCompatibilityScore}%
          </Badge>
        </div>
        <Progress value={roleCompatibilityScore} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {roleCompatibilityScore >= 80 ? 'Excellent multiplier pattern' :
           roleCompatibilityScore >= 60 ? 'Good progress' : 'Needs optimization'}
        </p>
      </div>

      {/* Time allocation metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border ${
          createTimeStatus === 'good' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3 w-3" />
            <span className="text-xs font-medium">Create Time</span>
          </div>
          <div className="text-sm">
            {Math.round(totalCreateTime / 60 * 10) / 10}h
          </div>
          <div className="text-xs text-muted-foreground">
            Target: ≤{MultiplierModeBehaviors.MAX_PERSONAL_CREATE_TIME / 60}h
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${
          connectTimeStatus === 'good' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-3 w-3" />
            <span className="text-xs font-medium">Connect Time</span>
          </div>
          <div className="text-sm">
            {Math.round(totalConnectTime / 60 * 10) / 10}h
          </div>
          <div className="text-xs text-muted-foreground">
            Target: ≥{MultiplierModeBehaviors.MIN_DAILY_CONNECT_TIME / 60}h
          </div>
        </div>
      </div>

      {/* Delegation opportunities */}
      {delegationOpportunities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Delegation Opportunities</span>
            <Badge variant="secondary">
              {delegationOpportunities.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {delegationOpportunities.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-muted-foreground">
                    {item.attention_type} • {item.duration_minutes}min
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-blue-600" />
              </div>
            ))}
            {delegationOpportunities.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{delegationOpportunities.length - 3} more opportunities
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Recommendations</span>
          <div className="space-y-1">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-700">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="pt-2 border-t">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7">
            <CheckCircle className="h-3 w-3 mr-1" />
            Schedule 1:1s
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7">
            <TrendingUp className="h-3 w-3 mr-1" />
            Context Sessions
          </Button>
        </div>
      </div>
    </div>
  );
}

function calculateMultiplierMetrics(items: TimelineItem[]): DelegationMetrics {
  // Calculate total time by attention type
  const totalCreateTime = items
    .filter(item => item.attention_type === ATTENTION_TYPES.CREATE)
    .reduce((total, item) => total + (item.duration_minutes || 0), 0);

  const totalConnectTime = items
    .filter(item => item.attention_type === ATTENTION_TYPES.CONNECT)
    .reduce((total, item) => total + (item.duration_minutes || 0), 0);

  // Identify delegation opportunities
  const delegationOpportunities = MultiplierModeBehaviors.identifyDelegationOpportunities(items);

  // Calculate role compatibility score
  const analysis = MultiplierModeBehaviors.analyzeTimeline(items);
  const roleCompatibilityScore = analysis.roleCompatibilityScore;

  // Generate recommendations
  const recommendations: string[] = [];

  if (totalCreateTime > MultiplierModeBehaviors.MAX_PERSONAL_CREATE_TIME) {
    const excessHours = Math.round((totalCreateTime - MultiplierModeBehaviors.MAX_PERSONAL_CREATE_TIME) / 60 * 10) / 10;
    recommendations.push(`Delegate ${excessHours}h of Create work to team members`);
  }

  if (totalConnectTime < MultiplierModeBehaviors.MIN_DAILY_CONNECT_TIME) {
    const neededHours = Math.round((MultiplierModeBehaviors.MIN_DAILY_CONNECT_TIME - totalConnectTime) / 60 * 10) / 10;
    recommendations.push(`Add ${neededHours}h more Connect time for team enablement`);
  }

  if (delegationOpportunities.length > 0) {
    recommendations.push(`${delegationOpportunities.length} tasks are suitable for delegation`);
  }

  if (items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE).length > 3) {
    recommendations.push('Consider delegating some decision-making to experienced team members');
  }

  return {
    totalCreateTime,
    totalConnectTime,
    delegationOpportunities,
    roleCompatibilityScore,
    recommendations
  };
}