import { addDays, differenceInCalendarWeeks, startOfISOWeek } from 'date-fns';
import type { Schedule } from '../user-data/schema';
import { isoWeekday, toDate, toKey } from '../../shared/lib/dates';
import type { PlannedSessionInput } from './model';

// Генератор календаря: чистая функция «расписание → занятия плана». Правила — docs/architecture.md.
// Неделя программы — календарная Пн–Вс, неделя 1 — та, в которую попал старт (может быть неполной).

const TEST_EVERY_WEEKS = 4;

/** Длина программы в неделях (MVP — фиксированные 12). */
export const PROGRAM_WEEKS = 12;

/** Этап программы по номеру недели: 1–4 → 1, 5–8 → 2, 9 и дальше → 3. */
export function stageOfWeek(week: number): 1 | 2 | 3 {
  return Math.min(3, Math.max(1, Math.ceil(week / 4))) as 1 | 2 | 3;
}

/** Номер недели программы (с 1) для даты; startDate — дата старта программы. */
export function weekOfDate(startDate: string, date: string): number {
  return differenceInCalendarWeeks(toDate(date), toDate(startDate), { weekStartsOn: 1 }) + 1;
}

type CalendarInput = Pick<Schedule, 'startDate' | 'clubDays' | 'homeDays' | 'weeks'>;

/**
 * Занятия плана от даты старта до конца последней недели программы.
 * id детерминированный (`ps-yyyy-MM-dd`): день занят одним занятием, повторная генерация
 * обновляет те же записи. Мини-тест (kind 'test') заменяет домашнее занятие: стартовый — первое
 * домашнее, остальные — последнее домашнее недель 4, 8, 12 (кратных 4 и в пределах программы).
 */
export function generateCalendar(input: CalendarInput): PlannedSessionInput[] {
  const { startDate, clubDays, homeDays, weeks } = input;
  const start = toDate(startDate);
  const end = addDays(startOfISOWeek(start), weeks * 7 - 1);

  const sessions: PlannedSessionInput[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const weekday = isoWeekday(day);
    const kind = clubDays.includes(weekday) ? 'club' : homeDays.includes(weekday) ? 'home' : null;
    if (kind === null) continue;
    const date = toKey(day);
    sessions.push({
      id: `ps-${date}`,
      date,
      stage: stageOfWeek(weekOfDate(startDate, date)),
      kind,
      status: 'planned',
    });
  }

  const homes = sessions.filter((s) => s.kind === 'home');
  const testIds = new Set<string>();
  if (homes[0]) testIds.add(homes[0].id);
  const lastHomeOfWeek = new Map<number, PlannedSessionInput>();
  for (const s of homes) lastHomeOfWeek.set(weekOfDate(startDate, s.date), s); // даты по возрастанию
  for (let week = TEST_EVERY_WEEKS; week <= weeks; week += TEST_EVERY_WEEKS) {
    const last = lastHomeOfWeek.get(week);
    if (last) testIds.add(last.id);
  }
  return sessions.map((s) => (testIds.has(s.id) ? { ...s, kind: 'test' } : s));
}
