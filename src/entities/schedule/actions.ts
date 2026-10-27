import { addDays } from 'date-fns';
import type { PlannedSession } from '../user-data/schema';
import { isoWeekday, toDate, toKey } from '../../shared/lib/dates';

// Действия над занятием плана — чистые функции, ничего не мутируют и возвращают результат.
// Календарь не сдвигается: пропуск и перенос трогают только само занятие («долга» нет).

export type Rejection =
  | 'not-found' // нет занятия с таким id
  | 'wrong-status' // действие недоступно из текущего статуса
  | 'future' // отметить можно не раньше дня занятия
  | 'not-saturday' // переносить можно только субботу
  | 'club-session' // занятие секции задаёт секция — не переносится
  | 'sunday-occupied' // в воскресенье уже есть занятие
  | 'past'; // воскресенье уже прошло

export type ActionResult = { ok: true; session: PlannedSession } | { ok: false; reason: Rejection };

const ok = (session: PlannedSession): ActionResult => ({ ok: true, session });
const reject = (reason: Rejection): ActionResult => ({ ok: false, reason });

/** «Выполнено» / «Был» (для секции). today и date — yyyy-MM-dd. */
export function markDone(session: PlannedSession, today: string): ActionResult {
  if (session.status !== 'planned') return reject('wrong-status');
  if (session.date > today) return reject('future');
  return ok({ ...session, status: 'done' });
}

/** Пропуск: можно и заранее. Остальные занятия остаются на своих датах. */
export function skip(session: PlannedSession): ActionResult {
  if (session.status !== 'planned') return reject('wrong-status');
  return ok({ ...session, status: 'skipped' });
}

/** Отмена отметки: «выполнено»/«пропущено» → «запланировано». */
export function resetStatus(session: PlannedSession): ActionResult {
  if (session.status === 'planned') return reject('wrong-status');
  return ok({ ...session, status: 'planned' });
}

/** Перенос субботнего домашнего занятия (или мини-теста) на воскресенье той же недели. */
export function moveToSunday(session: PlannedSession, plan: PlannedSession[], today: string): ActionResult {
  if (session.status !== 'planned') return reject('wrong-status');
  if (isoWeekday(toDate(session.date)) !== 6) return reject('not-saturday');
  if (session.kind === 'club') return reject('club-session');
  const sunday = toKey(addDays(toDate(session.date), 1));
  if (sunday < today) return reject('past');
  if (plan.some((s) => s.date === sunday && s.deletedAt === undefined)) return reject('sunday-occupied');
  return ok({ ...session, date: sunday, movedFrom: session.date });
}
