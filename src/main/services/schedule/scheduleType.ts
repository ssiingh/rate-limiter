/**
 * Schedule type definitions for time-based rate limit adjustments.
 */
export type ScheduleType = 'time_range' | 'cron' | 'day_of_week' | 'recurring';

export interface TimeRangeSchedule {
  type: 'time_range';
  startHour: number; // 0-23
  endHour: number;   // 0-23
  timezone?: string;
}

export interface CronSchedule {
  type: 'cron';
  expression: string; // e.g. '0 */5 * * *'
}

export interface DayOfWeekSchedule {
  type: 'day_of_week';
  days: number[]; // 0=Sun, 6=Sat
  startHour: number;
  endHour: number;
}

export interface RecurringSchedule {
  type: 'recurring';
  intervalMs: number;
  durationMs: number;
}

export type Schedule =
  | TimeRangeSchedule
  | CronSchedule
  | DayOfWeekSchedule
  | RecurringSchedule;

/**
 * Check if a time-range schedule is currently active.
 */
export function isTimeRangeActive(schedule: TimeRangeSchedule, now = new Date()): boolean {
  const hour = now.getHours();
  if (schedule.startHour <= schedule.endHour) {
    return hour >= schedule.startHour && hour < schedule.endHour;
  }
  // Wraps midnight (e.g., 22:00–06:00)
  return hour >= schedule.startHour || hour < schedule.endHour;
}

/**
 * Check if a day-of-week schedule is currently active.
 */
export function isDayOfWeekActive(schedule: DayOfWeekSchedule, now = new Date()): boolean {
  const day = now.getDay();
  const hour = now.getHours();
  return schedule.days.includes(day) && hour >= schedule.startHour && hour < schedule.endHour;
}
