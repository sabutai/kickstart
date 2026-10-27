import { createEffect, createEvent, createStore, sample } from 'effector';
import { newId } from '../../shared/lib/id';
import { getRepositories } from '../user-data/repos';
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
