/**
 * PlanDropdown Menu
 *
 * Dropdown menu for the Timeline header to access plan features.
 * Also includes Attention Budget in a popover for quick access.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, List, ChevronDown, Brain } from 'lucide-react';
import { useProjectPlans, ProjectPlan } from '@/hooks/useProjectPlans';
import { useTimeline } from '@/hooks/useTimeline';
import { PlanCreator } from './PlanCreator';
import { PlanList } from './PlanList';
import { SchedulePreview } from './SchedulePreview';
import { AttentionBudgetWidget } from '@/components/timeline/AttentionBudgetWidget';

export function PlanDropdown() {
  const { plans } = useProjectPlans();
  const { items } = useTimeline();

  const [showCreator, setShowCreator] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProjectPlan | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAttentionBudget, setShowAttentionBudget] = useState(false);

  // Count of schedulable plans
  const schedulablePlans = plans.filter(
    (p) => p.status === 'parsed' || p.status === 'scheduled'
  );

  const handleSchedulePlan = (plan: ProjectPlan) => {
    setSelectedPlan(plan);
    setShowList(false);
    setShowSchedule(true);
  };

  const handlePlanCreated = (planId: string) => {
    // Find the created plan and open schedule dialog
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setShowSchedule(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Plans
            {schedulablePlans.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {schedulablePlans.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56" aria-label="Plans menu">
          <DropdownMenuItem textValue="Create New Plan" onClick={() => setShowCreator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Plan
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem textValue="My Plans" onClick={() => setShowList(true)}>
            <List className="h-4 w-4 mr-2" />
            My Plans
            {plans.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {plans.length}
              </Badge>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Attention Budget - Opens as Popover */}
          <DropdownMenuItem textValue="Attention Budget" onClick={() => setShowAttentionBudget(true)}>
            <Brain className="h-4 w-4 mr-2" />
            Attention Budget
          </DropdownMenuItem>

          {/* Quick access to recent schedulable plans */}
          {schedulablePlans.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Ready to Schedule
              </div>
              {schedulablePlans.slice(0, 3).map((plan) => (
                <DropdownMenuItem
                  key={plan.id}
                  onClick={() => handleSchedulePlan(plan)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate flex-1">{plan.title}</span>
                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                    {plan.total_tasks}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <PlanCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onPlanCreated={handlePlanCreated}
      />

      <PlanList
        open={showList}
        onClose={() => setShowList(false)}
        onSchedulePlan={handleSchedulePlan}
      />

      <SchedulePreview
        open={showSchedule}
        onClose={() => {
          setShowSchedule(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        onApplied={() => {
          setShowSchedule(false);
          setSelectedPlan(null);
        }}
      />

      {/* Attention Budget Popover */}
      <Popover open={showAttentionBudget} onOpenChange={setShowAttentionBudget}>
        <PopoverTrigger asChild>
          <span className="sr-only">Open attention budget</span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Attention Budget</h3>
            <p className="text-xs text-muted-foreground">
              Track your cognitive load and energy allocation for today.
            </p>
            <AttentionBudgetWidget
              items={items}
              selectedDate={new Date()}
              compact={false}
            />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
