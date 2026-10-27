import { monthOf } from '../../shared/lib/dates';
import type { DayStatus } from '../../shared/ui/MonthGrid/MonthGrid';
import type { PlannedSession } from '../../entities/user-data/schema';

export const dayStatus = (session: PlannedSession | undefined): DayStatus => session?.status ?? 'none';

export type MonthStats = {
  /** Занятий в месяце. */
  total: number;
  /** Уже наступивших (дата ≤ сегодня). */
  due: number;
  done: number;
  /** Доля выполненных среди наступивших; null, пока ничего не наступило. */
  percent: number | null;
};

export function monthStats(plan: PlannedSession[], month: string, today: string): MonthStats {
  const inMonth = plan.filter((s) => monthOf(s.date) === month);
  const due = inMonth.filter((s) => s.date <= today);
  const done = due.filter((s) => s.status === 'done').length;
  return {
    total: inMonth.length,
    due: due.length,
    done,
    percent: due.length === 0 ? null : Math.round((done / due.length) * 100),
  };
}

/** Месяцы, по которым можно листать календарь. */
export function monthRange(plan: PlannedSession[], currentMonth: string): { first: string; last: string } {
  if (plan.length === 0) return { first: currentMonth, last: currentMonth };
  const months = plan.map((s) => monthOf(s.date)).sort();
  return { first: months[0]!, last: months.at(-1)! };
}
