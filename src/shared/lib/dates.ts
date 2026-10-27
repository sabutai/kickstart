import {
  addMonths,
  eachDayOfInterval,
  endOfISOWeek,
  endOfMonth,
  format,
  parse,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns';

// Даты плана — строки yyyy-MM-dd без времени суток: переход на летнее время ничего не сдвигает.
const DATE_FORMAT = 'yyyy-MM-dd';

export const toDate = (date: string): Date => parse(date, DATE_FORMAT, new Date(2000, 0, 1));
export const toKey = (date: Date): string => format(date, DATE_FORMAT);
/** День недели по ISO: 1 = пн … 7 = вс. */
export const isoWeekday = (date: Date): number => ((date.getDay() + 6) % 7) + 1;

export type MonthCell = { date: string; day: number; inMonth: boolean };

/** Месяц `yyyy-MM` → недели по 7 клеток (с понедельника), с днями соседних месяцев. 5 или 6 строк. */
export function buildMonthGrid(month: string): MonthCell[][] {
  const first = startOfMonth(parse(month, 'yyyy-MM', new Date(2000, 0, 1)));
  const days = eachDayOfInterval({ start: startOfISOWeek(first), end: endOfISOWeek(endOfMonth(first)) });
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days
        .slice(i, i + 7)
        .map((d) => ({ date: toKey(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth() })),
    );
  }
  return weeks;
}

/** Сдвиг месяца `yyyy-MM` на n месяцев (через границу года тоже). */
export function shiftMonth(month: string, n: number): string {
  return format(addMonths(parse(month, 'yyyy-MM', new Date(2000, 0, 1)), n), 'yyyy-MM');
}

export const monthOf = (date: string): string => date.slice(0, 7);
