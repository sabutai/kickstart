import { monthOf } from '../../shared/lib/dates';
import type { DayStatus } from '../../shared/ui/MonthGrid/MonthGrid';
import type { PlannedSession } from '../../entities/user-data/schema';

export const dayStatus = (session: PlannedSession | undefined): DayStatus => session?.status ?? 'none';

/** Месяцы, по которым можно листать календарь. */
export function monthRange(plan: PlannedSession[], currentMonth: string): { first: string; last: string } {
  if (plan.length === 0) return { first: currentMonth, last: currentMonth };
  const months = plan.map((s) => monthOf(s.date)).sort();
  return { first: months[0]!, last: months.at(-1)! };
}
