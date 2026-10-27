import { addDays, startOfISOWeek } from 'date-fns';
import { toDate, toKey } from '../../shared/lib/dates';
import type { PlannedSession } from '../user-data/schema';

export type HomeState =
  | { kind: 'session'; session: PlannedSession } // сегодня домашнее занятие или мини-тест, ещё не сделано
  | { kind: 'club'; session: PlannedSession } // сегодня секция, ещё не отмечена
  | { kind: 'done'; session: PlannedSession; next: PlannedSession | null }
  | { kind: 'skipped'; session: PlannedSession; next: PlannedSession | null }
  | { kind: 'rest'; next: PlannedSession | null } // сегодня занятия нет (в том числе до старта программы)
  | { kind: 'finished' }; // программа закончилась

const byDate = (a: PlannedSession, b: PlannedSession) => a.date.localeCompare(b.date);

/** Ближайшее запланированное занятие строго после сегодняшнего дня. */
function nextPlanned(plan: PlannedSession[], today: string): PlannedSession | null {
  return [...plan].sort(byDate).find((s) => s.date > today && s.status === 'planned') ?? null;
}

/** Что показать на главной: определяется планом и сегодняшней датой. */
export function homeState(plan: PlannedSession[], today: string): HomeState {
  const todays = plan.find((s) => s.date === today);
  if (todays) {
    if (todays.status === 'done') return { kind: 'done', session: todays, next: nextPlanned(plan, today) };
    if (todays.status === 'skipped')
      return { kind: 'skipped', session: todays, next: nextPlanned(plan, today) };
    return todays.kind === 'club' ? { kind: 'club', session: todays } : { kind: 'session', session: todays };
  }
  if (plan.length > 0 && !plan.some((s) => s.date > today)) return { kind: 'finished' };
  return { kind: 'rest', next: nextPlanned(plan, today) };
}

export type WeekGoal = { done: number; total: number; ratio: number };

/** Цель недели: выполнено / запланировано на календарной неделе Пн–Вс, в которую входит today. */
export function weekGoal(plan: PlannedSession[], today: string): WeekGoal {
  const monday = startOfISOWeek(toDate(today));
  const from = toKey(monday);
  const to = toKey(addDays(monday, 6));
  const week = plan.filter((s) => s.date >= from && s.date <= to);
  const done = week.filter((s) => s.status === 'done').length;
  return { done, total: week.length, ratio: week.length === 0 ? 0 : done / week.length };
}

/**
 * Серия — подряд выполненные запланированные занятия (домашние и «Был» в секции), а не дни подряд.
 * Обрывают серию: пропуск и прошедшее неотмеченное занятие. Сегодняшнее ещё не сделанное серию
 * не рвёт (день не кончился) и не прибавляет.
 */
export function streak(plan: PlannedSession[], today: string): number {
  const past = plan
    .filter((s) => s.date < today || (s.date === today && s.status !== 'planned'))
    .sort(byDate)
    .reverse();
  let count = 0;
  for (const s of past) {
    if (s.status !== 'done') break;
    count++;
  }
  return count;
}
