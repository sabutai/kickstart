import { createEffect, createEvent, createStore, sample } from 'effector';
import { newId } from '../../shared/lib/id';
import { getRepositories } from '../user-data/repos';
import type { ExerciseProgress, MiniTest, SessionLog } from '../user-data/schema';

type Meta = 'id' | 'updatedAt' | 'deletedAt';
export type ExerciseProgressInput = Omit<ExerciseProgress, Meta>;
export type SessionLogInput = Omit<SessionLog, Meta>;
export type MiniTestInput = Omit<MiniTest, Meta>;

/** Уровень, с которого начинается любое упражнение (уровни не пропускаются). */
export const START_LEVEL = 1;

export const loadProgressFx = createEffect(async () => {
  const repos = await getRepositories();
  const [progress, logs, tests] = await Promise.all([
    repos.exerciseProgress.list(),
    repos.sessionLogs.list(),
    repos.miniTests.list(),
  ]);
  return { progress, logs, tests };
});

const saveExerciseProgressFx = createEffect(
  async (input: ExerciseProgressInput): Promise<ExerciseProgress> => {
    const repos = await getRepositories();
    const existing = (await repos.exerciseProgress.findByKey(input.exerciseId))[0];
    return repos.exerciseProgress.save({ ...input, id: existing?.id ?? newId() });
  },
);

const logSessionFx = createEffect(async (input: SessionLogInput): Promise<SessionLog> => {
  const repos = await getRepositories();
  return repos.sessionLogs.save({ ...input, id: newId() });
});

const saveMiniTestFx = createEffect(async (input: MiniTestInput): Promise<MiniTest> => {
  const repos = await getRepositories();
  return repos.miniTests.save({ ...input, id: newId() });
});

/** Записать прогресс упражнения (уровень и серия чистых занятий). Правила повышения — этап 6. */
export const exerciseProgressSaved = createEvent<ExerciseProgressInput>();
/** Добавить запись о пройденном занятии. */
export const sessionLogged = createEvent<SessionLogInput>();
/** Добавить результат мини-теста. */
export const miniTestSaved = createEvent<MiniTestInput>();

export const $exerciseProgress = createStore<Record<string, ExerciseProgress>>({})
  .on(loadProgressFx.doneData, (_, { progress }) =>
    Object.fromEntries(progress.map((p) => [p.exerciseId, p])),
  )
  .on(saveExerciseProgressFx.doneData, (state, p) => ({ ...state, [p.exerciseId]: p }));

const byStartedAt = (a: SessionLog, b: SessionLog) => a.startedAt.localeCompare(b.startedAt);
const byDate = (a: MiniTest, b: MiniTest) => a.date.localeCompare(b.date);

export const $sessionLogs = createStore<SessionLog[]>([])
  .on(loadProgressFx.doneData, (_, { logs }) => [...logs].sort(byStartedAt))
  .on(logSessionFx.doneData, (state, log) => [...state, log].sort(byStartedAt));

export const $miniTests = createStore<MiniTest[]>([])
  .on(loadProgressFx.doneData, (_, { tests }) => [...tests].sort(byDate))
  .on(saveMiniTestFx.doneData, (state, test) => [...state, test].sort(byDate));

/** Текущий уровень упражнения: из прогресса или стартовый. */
export const $exerciseLevels = $exerciseProgress.map(
  (progress) => (exerciseId: string) => progress[exerciseId]?.level ?? START_LEVEL,
);

sample({ clock: exerciseProgressSaved, target: saveExerciseProgressFx });
sample({ clock: sessionLogged, target: logSessionFx });
sample({ clock: miniTestSaved, target: saveMiniTestFx });
