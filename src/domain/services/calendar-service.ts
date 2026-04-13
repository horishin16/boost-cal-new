import holidayJpModule from '@holiday-jp/holiday_jp';

// Handle both CJS and ESM import styles
const holidayJp = (holidayJpModule as { isHoliday?: (d: Date) => boolean; default?: { isHoliday: (d: Date) => boolean } });
const isHoliday = (date: Date): boolean => {
  if (typeof holidayJp.isHoliday === 'function') return holidayJp.isHoliday(date);
  if (holidayJp.default && typeof holidayJp.default.isHoliday === 'function') return holidayJp.default.isHoliday(date);
  return false;
};
import type { LinkSettings, TimeSlot } from '@/domain/models/schedule-link';

export interface BusyTime {
  start: string; // ISO string
  end: string;   // ISO string
}

export interface AvailableSlot {
  start: string; // ISO string
  end: string;   // ISO string
}

interface CalculateAvailabilityParams {
  settings: LinkSettings;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  duration: number;  // minutes
  busyTimes: BusyTime[];
  bufferMinutes?: number;
}

export class CalendarService {
  calculateAvailability(params: CalculateAvailabilityParams): AvailableSlot[] {
    const { settings, startDate, endDate, duration, busyTimes, bufferMinutes = 0 } = params;
    const slots: AvailableSlot[] = [];

    const current = new Date(startDate + 'T00:00:00+09:00');
    const end = new Date(endDate + 'T23:59:59+09:00');

    while (current <= end) {
      const dateStr = formatDate(current);
      const dayOfWeek = current.getDay().toString(); // 0=Sun, 1=Mon, ...

      const daySlots = this.getDayTimeSlots(dateStr, dayOfWeek, settings);

      if (daySlots !== null) {
        for (const timeSlot of daySlots) {
          const slotStart = parseTime(dateStr, timeSlot.start);
          const slotEnd = parseTime(dateStr, timeSlot.end);

          // Generate duration-sized windows within this time slot
          let windowStart = slotStart;
          while (windowStart + duration * 60 * 1000 <= slotEnd) {
            const windowEnd = windowStart + duration * 60 * 1000;

            // Check if this window (with buffer) overlaps any busy time
            const bufferedStart = windowStart - bufferMinutes * 60 * 1000;
            const bufferedEnd = windowEnd + bufferMinutes * 60 * 1000;

            const isBusy = busyTimes.some((busy) => {
              const busyStart = new Date(busy.start).getTime();
              const busyEnd = new Date(busy.end).getTime();
              return bufferedStart < busyEnd && bufferedEnd > busyStart;
            });

            if (!isBusy) {
              slots.push({
                start: toISOWithTZ(windowStart),
                end: toISOWithTZ(windowEnd),
              });
            }

            windowStart += 30 * 60 * 1000; // advance by 30 min
          }
        }
      }

      // Next day
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private getDayTimeSlots(
    dateStr: string,
    dayOfWeek: string,
    settings: LinkSettings
  ): TimeSlot[] | null {
    // Check dateOverrides first
    if (settings.dateOverrides && dateStr in settings.dateOverrides) {
      const overrides = settings.dateOverrides[dateStr];
      if (overrides.length === 0) return null; // explicitly excluded
      return overrides;
    }

    // Check if holiday
    if (settings.excludeHolidays) {
      const date = new Date(dateStr + 'T00:00:00+09:00');
      if (isHoliday(date)) {
        return null;
      }
    }

    // Use weekday time slots
    const daySlots = settings.weekdayTimeSlots[dayOfWeek];
    if (!daySlots || daySlots.length === 0) return null;

    return daySlots;
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTime(dateStr: string, time: string): number {
  return new Date(`${dateStr}T${time}:00+09:00`).getTime();
}

function toISOWithTZ(timestamp: number): string {
  const date = new Date(timestamp);
  const offsetMs = 9 * 60 * 60 * 1000;
  const jst = new Date(date.getTime() + offsetMs);
  const iso = jst.toISOString().replace('Z', '+09:00');
  return iso;
}
