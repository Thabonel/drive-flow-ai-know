// Enhanced Multiplier Dashboard with delegation workflow integration
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES, ROLE_MODES } from '@/lib/attentionTypes';
import { MultiplierModeBehaviors } from '@/lib/roleBasedBehaviors';
import { DelegationDashboard } from './DelegationDashboard';
import { RouterInbox } from './RouterInbox';
import { TrustLevelManagement } from './TrustLevelManagement';
import { FollowUpAutomation } from './FollowUpAutomation';
import {
  Users,
  ArrowRight,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Inbox,
  Route,
  Calendar,
  Award,
  Bell
} from 'lucide-react';

interface MultiplierDashboardProps {
  items: TimelineItem[];
  currentDate: Date;
  currentRole?: string;
  compact?: boolean;
  showFullDashboard?: boolean;
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
  compact = false,
  showFullDashboard = false
}: MultiplierDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Only show for Multiplier mode
  if (currentRole !== ROLE_MODES.MULTIPLIER) {
    return null;
  }

  // Filter items for the current date
  const todaysItems = items.filter(item =>
    new Date(item.start_time).toDateString() === currentDate.toDateString()
  );

  const metrics = useMemo(() => calculateMultiplierMetrics(todaysItems), [todaysItems]);

  // Compact mode - just the quick overview
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
          <MultiplierDashboardContent metrics={metrics} compact />
        </PopoverContent>
      </Popover>
    );
  }

  // Full dashboard mode - comprehensive delegation management
  if (showFullDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Multiplier Command Center
            </h2>
            <p className="text-gray-600">Manage delegations, team routing, and trust levels</p>
          </div>
          <Badge variant={metrics.roleCompatibilityScore >= 70 ? "default" : "destructive"} className="text-lg px-3 py-1">
            {metrics.roleCompatibilityScore}% Effectiveness
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Router Inbox
            </TabsTrigger>
            <TabsTrigger value="delegations" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Delegations
            </TabsTrigger>
            <TabsTrigger value="trust-levels" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Trust Levels
            </TabsTrigger>
            <TabsTrigger value="follow-ups" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Follow-ups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <MultiplierOverview metrics={metrics} items={todaysItems} />
          </TabsContent>

          <TabsContent value="inbox">
            <RouterInbox />
          </TabsContent>

          <TabsContent value="delegations">
            <DelegationDashboard />
          </TabsContent>

          <TabsContent value="trust-levels">
            <TrustLevelManagement />
          </TabsContent>

          <TabsContent value="follow-ups">
            <FollowUpAutomation />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Standard sidebar widget
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

// Enhanced overview section for full dashboard mode
function MultiplierOverview({ metrics, items }: { metrics: DelegationMetrics; items: TimelineItem[] }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Enablement</p>
                <p className="text-2xl font-bold">{Math.round(metrics.totalConnectTime / 60 * 10) / 10}h</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Personal Work</p>
                <p className="text-2xl font-bold">{Math.round(metrics.totalCreateTime / 60 * 10) / 10}h</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delegation Ops</p>
                <p className="text-2xl font-bold">{metrics.delegationOpportunities.length}</p>
              </div>
              <Route className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Effectiveness</p>
                <p className="text-2xl font-bold">{metrics.roleCompatibilityScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Attention Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AttentionAllocationChart items={items} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multiplier Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiplierDashboardContent metrics={metrics} compact />
          </CardContent>
        </Card>
      </div>

      {/* Delegation Opportunities */}
      {metrics.delegationOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Delegation Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.delegationOpportunities.map((item, index) => (
                <DelegationOpportunityCard key={index} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Attention allocation chart component
function AttentionAllocationChart({ items }: { items: TimelineItem[] }) {
  const attentionBreakdown = useMemo(() => {
    const breakdown = {
      create: 0,
      decide: 0,
      connect: 0,
      review: 0,
      recover: 0
    };

    items.forEach(item => {
      if (item.attention_type && breakdown.hasOwnProperty(item.attention_type)) {
        breakdown[item.attention_type as keyof typeof breakdown] += item.duration_minutes || 0;
      }
    });

    const total = Object.values(breakdown).reduce((sum, time) => sum + time, 0);

    return Object.entries(breakdown).map(([type, time]) => ({
      type,
      time,
      percentage: total > 0 ? (time / total) * 100 : 0
    }));
  }, [items]);

  return (
    <div className="space-y-4">
      {attentionBreakdown.map(({ type, time, percentage }) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize font-medium">{type}</span>
            <div className="flex items-center gap-2">
              <span>{Math.round(time / 60 * 10) / 10}h</span>
              <span className="text-gray-500">({Math.round(percentage)}%)</span>
            </div>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
}

// Individual delegation opportunity card
function DelegationOpportunityCard({ item }: { item: TimelineItem }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <h4 className="font-medium">{item.title}</h4>
        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
          <Badge variant="outline" className="capitalize">
            {item.attention_type}
          </Badge>
          <span>{item.duration_minutes} minutes</span>
          <span>{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Suitable for delegation due to {item.duration_minutes && item.duration_minutes > 90 ? 'length' : 'type'}
        </p>
      </div>
      <Button variant="outline" size="sm">
        <Route className="h-4 w-4 mr-2" />
        Delegate
      </Button>
    </div>
  );
}

function MultiplierDashboardContent({ metrics, compact = false }: { metrics: DelegationMetrics; compact?: boolean }) {
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