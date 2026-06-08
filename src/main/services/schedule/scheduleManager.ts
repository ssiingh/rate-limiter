import type { RateLimitConfig } from '../../models';
import type { Schedule } from './scheduleType';
import type { TransitionConfig } from './transitionConfig';
import { isTimeRangeActive, isDayOfWeekActive } from './scheduleType';
import { interpolateLimit } from './transitionConfig';
import logger from '../../utils/logger';

interface ScheduleEntry {
  id: string;
  schedule: Schedule;
  transition: TransitionConfig;
}

/**
 * Manages schedule-based rate limit configuration changes.
 * Evaluates registered schedules and returns the effective configuration.
 */
export class ScheduleManager {
  private readonly entries: ScheduleEntry[] = [];

  /**
   * Register a new schedule with its transition configuration.
   */
  register(id: string, schedule: Schedule, transition: TransitionConfig): void {
    this.entries.push({ id, schedule, transition });
    // Sort by priority descending
    this.entries.sort((a, b) => b.transition.priority - a.transition.priority);
    logger.info('Schedule registered', { id, type: schedule.type });
  }

  /**
   * Remove a schedule by ID.
   */
  unregister(id: string): boolean {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.entries.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluate all schedules and return the config overrides for a key.
   * Returns null if no schedule is active for the key.
   */
  evaluate(key: string, now = new Date()): Partial<RateLimitConfig> | null {
    for (const entry of this.entries) {
      if (entry.transition.key !== key && entry.transition.key !== '*') continue;

      const active = this.isScheduleActive(entry.schedule, now);
      if (active) {
        return entry.transition.activeConfig;
      } else if (entry.transition.inactiveConfig) {
        return entry.transition.inactiveConfig;
      }
    }
    return null;
  }

  private isScheduleActive(schedule: Schedule, now: Date): boolean {
    switch (schedule.type) {
      case 'time_range':
        return isTimeRangeActive(schedule, now);
      case 'day_of_week':
        return isDayOfWeekActive(schedule, now);
      case 'cron':
        // Cron scheduling requires a full cron parser; mark as inactive for basic use
        return false;
      case 'recurring':
        // Check if within the current recurrence window
        const elapsed = now.getTime() % schedule.intervalMs;
        return elapsed < schedule.durationMs;
      default:
        return false;
    }
  }

  /**
   * List all registered schedules.
   */
  listSchedules(): ScheduleEntry[] {
    return [...this.entries];
  }
}

export default ScheduleManager;
