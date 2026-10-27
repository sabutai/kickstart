import { createEffect, createEvent, createStore, sample, type EventCallable } from 'effector';
import { newId } from '../../shared/lib/id';
import { getRepositories } from '../user-data/repos';
import { markDone, moveToSunday, resetStatus, skip, type ActionResult, type Rejection } from './actions';
import { toKey } from './dates';
import { PlannedSessionSchema, type PlannedSession, type Schedule } from '../user-data/schema';

type Meta = 'id' | 'updatedAt' | 'deletedAt';
export type ScheduleInput = Omit<Schedule, Meta>;
/** Занятие плана: id задаёт генератор календаря (этап 3), SyncMeta — хранилище. */
export type PlannedSessionInput = Omit<PlannedSession, 'updatedAt' | 'deletedAt'>;

export const loadScheduleFx = createEffect(async (): Promise<Schedule | null> => {
  const repos = await getRepositories();
  return (await repos.schedules.list())[0] ?? null;
});

export const loadPlannedSessionsFx = createEffect(async (): Promise<PlannedSession[]> => {
  const repos = await getRepositories();
  return repos.plannedSessions.list();
});

const saveScheduleFx = createEffect(async (input: ScheduleInput): Promise<Schedule> => {
  const repos = await getRepositories();
  const existing = (await repos.schedules.list())[0];
  return repos.schedules.save({ ...input, id: existing?.id ?? newId() });
});

const savePlannedSessionsFx = createEffect(
  async (inputs: PlannedSessionInput[]): Promise<PlannedSession[]> => {
    // Сначала проверяем всё, потом пишем: ошибка в одном занятии не оставляет полусохранённую пачку.
    const stamp = new Date().toISOString();
    for (const input of inputs) PlannedSessionSchema.parse({ ...input, updatedAt: stamp });
    const repos = await getRepositories();
    const saved: PlannedSession[] = [];
    for (const input of inputs) saved.push(await repos.plannedSessions.save(input));
    return saved;
  },
);

/** Создать или обновить расписание целиком. */
export const scheduleSaved = createEvent<ScheduleInput>();
/** Создать или обновить занятия плана (upsert по id). */
export const plannedSessionsSaved = createEvent<PlannedSessionInput[]>();

export const $schedule = createStore<Schedule | null>(null)
  .on(loadScheduleFx.doneData, (_, schedule) => schedule)
  .on(saveScheduleFx.doneData, (_, schedule) => schedule);

const byDate = (a: PlannedSession, b: PlannedSession) =>
  a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export const $plannedSessions = createStore<PlannedSession[]>([])
  .on(loadPlannedSessionsFx.doneData, (_, list) => [...list].sort(byDate))
  .on(savePlannedSessionsFx.doneData, (state, saved) => {
    const byId = new Map(state.map((s) => [s.id, s]));
    for (const s of saved) byId.set(s.id, s);
    return [...byId.values()].sort(byDate);
  });

sample({ clock: scheduleSaved, target: saveScheduleFx });
sample({ clock: plannedSessionsSaved, target: savePlannedSessionsFx });

// --- Действия над занятиями: решение принимают чистые функции из ./actions ---

/** Отметить «выполнено» / «Был» (для секции). */
export const sessionDone = createEvent<{ id: string }>();
/** Пропустить занятие. */
export const sessionSkipped = createEvent<{ id: string }>();
/** Отменить отметку «выполнено»/«пропущено». */
export const sessionStatusReset = createEvent<{ id: string }>();
/** Перенести субботнее занятие на воскресенье. */
export const sessionMovedToSunday = createEvent<{ id: string }>();
/** Действие недоступно: UI показывает причину. */
export const sessionActionRejected = createEvent<{ id: string; reason: Rejection }>();

type Run = (session: PlannedSession, plan: PlannedSession[], today: string) => ActionResult;
type Decision = { id: string; result: ActionResult };

function wireAction(clock: EventCallable<{ id: string }>, run: Run) {
  const decided = sample({
    clock,
    source: $plannedSessions,
    fn: (plan, { id }): Decision => {
      const session = plan.find((s) => s.id === id);
      const result: ActionResult = session
        ? run(session, plan, toKey(new Date()))
        : { ok: false, reason: 'not-found' };
      return { id, result };
    },
  });
  sample({
    clock: decided,
    filter: ({ result }) => result.ok,
    fn: ({ result }): PlannedSessionInput[] => [(result as { ok: true; session: PlannedSession }).session],
    target: savePlannedSessionsFx,
  });
  sample({
    clock: decided,
    filter: ({ result }) => !result.ok,
    fn: ({ id, result }) => ({ id, reason: (result as { ok: false; reason: Rejection }).reason }),
    target: sessionActionRejected,
  });
}

wireAction(sessionDone, (s, _plan, today) => markDone(s, today));
wireAction(sessionSkipped, (s) => skip(s));
wireAction(sessionStatusReset, (s) => resetStatus(s));
wireAction(sessionMovedToSunday, (s, plan, today) => moveToSunday(s, plan, today));
