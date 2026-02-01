import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  MobileRoleZoneSelector,
  MobileAttentionBudget,
  MobileDelegationPanel,
  MobileTimelineControls,
  MobileCalibrationWizard
} from '@/components/timeline/mobile';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES } from '@/lib/attentionTypes';
import { Vibrate } from '@/lib/haptics';
import {
  Smartphone,
  Target,
  Users,
  Clock,
  Brain,
  Zap,
  HandMetal,
  Headphones,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function MobileAttentionDemo() {
  const [selectedDate] = useState(new Date());
  const [sampleItems, setSampleItems] = useState<TimelineItem[]>([]);
  const [showFeatureDemo, setShowFeatureDemo] = useState(false);

  const isMobile = useIsMobile();

  // Generate sample timeline items for demonstration
  useEffect(() => {
    const now = new Date();
    const sampleData: TimelineItem[] = [
      {
        id: '1',
        title: 'Design System Review',
        description: 'Review and update mobile component designs',
        start_time: new Date(now.getTime() + 60000 * 60).toISOString(), // 1 hour from now
        duration_minutes: 90,
        attention_type: 'review',
        priority: 4,
        user_id: 'demo-user',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '2',
        title: 'Build Mobile Components',
        description: 'Implement gesture-based attention management UI',
        start_time: new Date(now.getTime() + 60000 * 150).toISOString(), // 2.5 hours from now
        duration_minutes: 120,
        attention_type: 'create',
        priority: 5,
        is_non_negotiable: true,
        user_id: 'demo-user',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '3',
        title: 'Team Standup',
        description: 'Daily sync with development team',
        start_time: new Date(now.getTime() + 60000 * 240).toISOString(), // 4 hours from now
        duration_minutes: 30,
        attention_type: 'admin',
        priority: 3,
        user_id: 'demo-user',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '4',
        title: 'Code Review - Mobile Features',
        description: 'Review pull requests for mobile attention system',
        start_time: new Date(now.getTime() + 60000 * 300).toISOString(), // 5 hours from now
        duration_minutes: 60,
        attention_type: 'review',
        priority: 4,
        user_id: 'demo-user',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    ];

    setSampleItems(sampleData);
  }, []);

  const handleItemComplete = (item: TimelineItem) => {
    setSampleItems(prev => prev.filter(i => i.id !== item.id));
    Vibrate.success();
    toast.success(`"${item.title}" marked complete with mobile gesture!`);
  };

  const handleItemPark = (item: TimelineItem) => {
    setSampleItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, is_parked: true } : i)
    );
    Vibrate.light();
    toast.info(`"${item.title}" parked for later`);
  };

  const handleItemDelegate = (item: TimelineItem, delegateInfo: any) => {
    setSampleItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, delegated_to: delegateInfo.delegate_id } : i)
    );
    Vibrate.success();
    toast.success(`"${item.title}" delegated successfully!`);
  };

  const demoFeatures = [
    {
      icon: <HandMetal className="h-5 w-5" />,
      title: "Swipe Gestures",
      description: "Swipe right to complete, down to park, long press for options",
      color: "bg-blue-50 border-blue-200 text-blue-700"
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      title: "Voice Input",
      description: "Use voice-to-text for delegation notes and task descriptions",
      color: "bg-green-50 border-green-200 text-green-700"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Attention Budget",
      description: "Real-time budget monitoring with mobile-optimized visualizations",
      color: "bg-purple-50 border-purple-200 text-purple-700"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Mobile Delegation",
      description: "Touch-optimized team member selection and trust level assignment",
      color: "bg-orange-50 border-orange-200 text-orange-700"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Offline Calculations",
      description: "Attention budgets work offline with cached timeline data",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Haptic Feedback",
      description: "Tactile confirmation for all mobile interactions and warnings",
      color: "bg-yellow-50 border-yellow-200 text-yellow-700"
    }
  ];

  if (!isMobile) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Mobile Device Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                The mobile attention management features are optimized for touch devices.
                Visit this page on a mobile device to experience:
              </p>
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Touch gestures for task management</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Voice input for delegation notes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Haptic feedback for interactions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Offline attention calculations</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Progressive web app features</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            Mobile Attention Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Experience the complete 3-2-1 attention system optimized for mobile
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="gap-1">
              <HandMetal className="h-3 w-3" />
              Touch Gestures
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Headphones className="h-3 w-3" />
              Voice Input
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              Offline Ready
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Role/Zone Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role & Zone Selection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tap to change, swipe for quick switching
          </p>
        </CardHeader>
        <CardContent>
          <MobileRoleZoneSelector className="justify-center" />
        </CardContent>
      </Card>

      {/* Attention Budget */}
      <MobileAttentionBudget
        items={sampleItems}
        selectedDate={selectedDate}
        onBudgetWarning={(warnings) => {
          if (warnings.length > 0) {
            toast.warning(`Attention Budget Alert: ${warnings[0]}`);
          }
        }}
      />

      {/* Timeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Interactive Timeline
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tap to expand, long press for menu, swipe for actions
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <MobileTimelineControls
            items={sampleItems}
            selectedDate={selectedDate}
            onItemComplete={handleItemComplete}
            onItemPark={handleItemPark}
            onItemDelegate={handleItemDelegate}
            onItemEdit={(item) => {
              Vibrate.selection();
              toast.info(`Edit "${item.title}" - Demo mode`);
            }}
            onItemDelete={(item) => {
              setSampleItems(prev => prev.filter(i => i.id !== item.id));
              Vibrate.error();
              toast.success(`"${item.title}" deleted`);
            }}
          />
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Mobile Features
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowFeatureDemo(!showFeatureDemo);
                Vibrate.light();
              }}
            >
              {showFeatureDemo ? 'Hide' : 'Show'} Details
            </Button>
          </CardTitle>
        </CardHeader>
        {showFeatureDemo && (
          <CardContent>
            <div className="grid gap-3">
              {demoFeatures.map((feature, index) => (
                <Card key={index} className={`border ${feature.color}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {feature.icon}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        <p className="text-xs mt-1 opacity-90">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calibration Wizard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Calibration & Setup
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalize your attention management system
          </p>
        </CardHeader>
        <CardContent>
          <MobileCalibrationWizard
            onComplete={(preferences) => {
              toast.success('Attention preferences calibrated!');
              console.log('Calibrated preferences:', preferences);
            }}
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Try These Gestures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Tap timeline item</span>
              <Badge variant="outline">Expand details</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Long press item</span>
              <Badge variant="outline">Context menu</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Swipe right on item</span>
              <Badge variant="outline">Complete task</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Swipe down on item</span>
              <Badge variant="outline">Park task</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Swipe left/right roles</span>
              <Badge variant="outline">Quick switch</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Long press delegation</span>
              <Badge variant="outline">Voice input</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA Installation Hint */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardContent className="p-4 text-center">
          <div className="space-y-2">
            <Smartphone className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm font-medium">Install as App</p>
            <p className="text-xs text-muted-foreground">
              Add AI Query Hub to your home screen for the best mobile experience
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // This would trigger PWA install prompt
                toast.info('PWA installation available - check your browser menu');
              }}
            >
              Install App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}