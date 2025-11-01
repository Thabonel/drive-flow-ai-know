import { useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

interface WorkloadStats {
  totalPlannedMinutes: number;
  totalPlannedHours: number;
  meetingMinutes: number;
  flexibleMinutes: number;
  availableMinutes: number;
  isOvercommitted: boolean;
  overcommittedBy: number; // minutes over the limit
  utilizationPercent: number;
  warningMessage: string | null;
}

const STANDARD_WORK_DAY_HOURS = 8;
const STANDARD_WORK_DAY_MINUTES = STANDARD_WORK_DAY_HOURS * 60;

export const useWorkload = (items: TimelineItem[], targetDate?: Date) => {
  const date = targetDate || new Date();

  const stats = useMemo((): WorkloadStats => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Filter items for the target date
    const dayItems = items.filter((item) => {
      const itemStart = parseISO(item.start_time);
      return isWithinInterval(itemStart, { start: dayStart, end: dayEnd });
    });

    // Calculate totals
    let totalPlannedMinutes = 0;
    let meetingMinutes = 0;
    let flexibleMinutes = 0;

    dayItems.forEach((item) => {
      const duration = item.planned_duration_minutes || item.duration_minutes || 0;
      totalPlannedMinutes += duration;

      if (item.is_meeting) {
        meetingMinutes += duration;
      }

      if (item.is_flexible) {
        flexibleMinutes += duration;
      }
    });

    const totalPlannedHours = totalPlannedMinutes / 60;
    const availableMinutes = STANDARD_WORK_DAY_MINUTES - meetingMinutes;
    const utilizationPercent = Math.round((totalPlannedMinutes / STANDARD_WORK_DAY_MINUTES) * 100);
    const isOvercommitted = totalPlannedMinutes > STANDARD_WORK_DAY_MINUTES;
    const overcommittedBy = Math.max(0, totalPlannedMinutes - STANDARD_WORK_DAY_MINUTES);

    // Generate warning message
    let warningMessage: string | null = null;
    if (isOvercommitted) {
      const overHours = Math.floor(overcommittedBy / 60);
      const overMinutes = overcommittedBy % 60;
      if (overHours > 0) {
        warningMessage = `You're overbooked by ${overHours}h ${overMinutes}m`;
      } else {
        warningMessage = `You're overbooked by ${overMinutes} minutes`;
      }
    }

    return {
      totalPlannedMinutes,
      totalPlannedHours,
      meetingMinutes,
      flexibleMinutes,
      availableMinutes,
      isOvercommitted,
      overcommittedBy,
      utilizationPercent,
      warningMessage,
    };
  }, [items, date]);

  const calculateDailyWorkload = (targetDate: Date): WorkloadStats => {
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const dayItems = items.filter((item) => {
      const itemStart = parseISO(item.start_time);
      return isWithinInterval(itemStart, { start: dayStart, end: dayEnd });
    });

    let totalPlannedMinutes = 0;
    let meetingMinutes = 0;
    let flexibleMinutes = 0;

    dayItems.forEach((item) => {
      const duration = item.planned_duration_minutes || item.duration_minutes || 0;
      totalPlannedMinutes += duration;

      if (item.is_meeting) {
        meetingMinutes += duration;
      }

      if (item.is_flexible) {
        flexibleMinutes += duration;
      }
    });

    const totalPlannedHours = totalPlannedMinutes / 60;
    const availableMinutes = STANDARD_WORK_DAY_MINUTES - meetingMinutes;
    const utilizationPercent = Math.round((totalPlannedMinutes / STANDARD_WORK_DAY_MINUTES) * 100);
    const isOvercommitted = totalPlannedMinutes > STANDARD_WORK_DAY_MINUTES;
    const overcommittedBy = Math.max(0, totalPlannedMinutes - STANDARD_WORK_DAY_MINUTES);

    let warningMessage: string | null = null;
    if (isOvercommitted) {
      const overHours = Math.floor(overcommittedBy / 60);
      const overMinutes = overcommittedBy % 60;
      if (overHours > 0) {
        warningMessage = `You're overbooked by ${overHours}h ${overMinutes}m`;
      } else {
        warningMessage = `You're overbooked by ${overMinutes} minutes`;
      }
    }

    return {
      totalPlannedMinutes,
      totalPlannedHours,
      meetingMinutes,
      flexibleMinutes,
      availableMinutes,
      isOvercommitted,
      overcommittedBy,
      utilizationPercent,
      warningMessage,
    };
  };

  const getAvailableTime = (targetDate: Date): number => {
    const workload = calculateDailyWorkload(targetDate);
    return workload.availableMinutes;
  };

  const isOvercommitted = (targetDate: Date): boolean => {
    const workload = calculateDailyWorkload(targetDate);
    return workload.isOvercommitted;
  };

  return {
    stats,
    calculateDailyWorkload,
    getAvailableTime,
    isOvercommitted,
  };
};
