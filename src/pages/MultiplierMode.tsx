// Multiplier Mode - Full Delegation Workflow Dashboard Page
import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useTimelineContext } from '@/contexts/TimelineContext';
import { MultiplierDashboard } from '@/components/timeline/MultiplierDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ArrowLeft,
  Target,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function MultiplierMode() {
  const { currentRole } = useUserRole();
  const { items } = useTimelineContext();
  const [currentDate] = useState(new Date());

  // Only render for Multiplier users
  if (currentRole !== 'multiplier') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Multiplier Mode Unavailable</h2>
            <p className="text-gray-600 mb-4">
              Switch to Multiplier role to access delegation workflow features.
            </p>
            <Link to="/timeline">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Timeline
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Multiplier Mode</h1>
            <Badge variant="default" className="bg-blue-600">
              Delegation Workflow System
            </Badge>
          </div>
          <p className="text-gray-600 text-lg">
            Comprehensive delegation management and team productivity optimization
          </p>
        </div>
        <Link to="/timeline">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Timeline
          </Button>
        </Link>
      </div>

      {/* Key Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FeatureCard
          icon={<Target className="h-6 w-6 text-blue-600" />}
          title="Router Inbox"
          description="Centralized request triage and routing system"
          status="Ready"
          statusColor="text-green-600"
        />
        <FeatureCard
          icon={<Users className="h-6 w-6 text-green-600" />}
          title="Trust Management"
          description="AI-powered trust level progression tracking"
          status="Active"
          statusColor="text-green-600"
        />
        <FeatureCard
          icon={<Clock className="h-6 w-6 text-purple-600" />}
          title="Follow-up Automation"
          description="Trust-based follow-up scheduling and tracking"
          status="Automated"
          statusColor="text-purple-600"
        />
        <FeatureCard
          icon={<TrendingUp className="h-6 w-6 text-orange-600" />}
          title="Analytics Dashboard"
          description="Success rate tracking and team performance metrics"
          status="Live"
          statusColor="text-orange-600"
        />
      </div>

      {/* System Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            System Benefits & Achievements
          </CardTitle>
          <CardDescription>
            What the Delegation Workflow System accomplishes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">For Multipliers (Managers)</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>10x Productivity:</strong> Scale through systematic delegation with trust-based follow-ups</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Request Routing:</strong> Centralized inbox for triaging and routing incoming asks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Team Development:</strong> Progressive trust level system builds team capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Smart Analytics:</strong> Track delegation success rates and optimize patterns</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-800">For Team Members</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Clear Expectations:</strong> Structured delegation with context and requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Growth Pathway:</strong> Transparent trust level progression with feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Appropriate Support:</strong> Follow-up frequency matches experience level</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Workload Balance:</strong> Smart routing prevents overload and optimizes skills</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <MultiplierDashboard
        items={items}
        currentDate={currentDate}
        currentRole={currentRole}
        showFullDashboard={true}
      />
    </div>
  );
}

// Helper component for feature cards
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
  statusColor: string;
}

function FeatureCard({ icon, title, description, status, statusColor }: FeatureCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          {icon}
          <Badge variant="outline" className={statusColor}>
            {status}
          </Badge>
        </div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}