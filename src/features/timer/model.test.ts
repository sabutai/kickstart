import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork, type Scope } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';

const env = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  tap: vi.fn(),
  awake: [] as boolean[],
}));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));
vi.mock('../../shared/lib/platform', () => ({
  haptics: { tap: () => env.tap() },
  keepAwake: {
    on: async () => void env.awake.push(true),
    off: async () => void env.awake.push(false),
  },
}));

import { getExercise } from '../../content';
import { $sessionLogs } from '../../entities/progress/model';
import {
  $plannedSessions,
  plannedSessionsSaved,
  type PlannedSessionInput,
} from '../../entities/schedule/model';
import type { BuiltSession, SessionItem } from '../../entities/session/build';
import { createPlayer, remainingMs } from '../../entities/session/player';
import {
  $endDialogOpen,
  $planId,
  $player,
  $sessionActive,
  endChosen,
  endDialogClosed,
  endDialogOpened,
  playerEvent,
  sessionLeft,
  startRequested,
  timerScreenLeft,
} from './model';

const TODAY = '2026-11-03';
const plan = (over: Partial<PlannedSessionInput> = {}): PlannedSessionInput => ({
  id: `ps-${TODAY}`,
  date: TODAY,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});

const item = (
  id: string,
  partKind: SessionItem['partKind'],
  volume: Partial<SessionItem['volume']> = {},
): SessionItem => ({
  exercise: getExercise(id)!,
  level: 1,
  partKind,
  volume: { sets: 1, workSec: 10, perSide: false, restSec: 0, ...volume },
});
const tiny = (...items: SessionItem[]): BuiltSession => ({
  parts: [...new Set(items.map((i) => i.partKind))],
  items,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  env.db = await freshDb();
  env.tap.mockClear();
  env.awake = [];
});
afterEach(() => vi.useRealTimers());

async function withPlan(planned: PlannedSessionInput[] = [plan()]): Promise<Scope> {
  const scope = fork();
  await allSettled(plannedSessionsSaved, { scope, params: planned });
  return scope;
}

/** Занятие в нужном состоянии, без сборки настоящей программы. */
async function withRunning(session: BuiltSession): Promise<Scope> {
  const scope = fork({
    values: [
      [$player, createPlayer(session, Date.now())],
      [$planId, `ps-${TODAY}`],
    ],
  });
  await allSettled(plannedSessionsSaved, { scope, params: [plan()] });
  return scope;
}

describe('запуск занятия', () => {
  it('«Поехали» собирает и запускает занятие на сегодня; экран не гаснет', async () => {
    const scope = await withPlan();
    await allSettled(startRequested, { scope });
    const player = scope.getState($player);
    expect(player?.phase).toBe('ready');
    expect(player?.session.items.length).toBeGreaterThan(10);
    expect(scope.getState($planId)).toBe(`ps-${TODAY}`);
    expect(scope.getState($sessionActive)).toBe(true);
    expect(env.awake).toEqual([true]);
  });

  it('нечего запускать (нет занятия, секция, выполнено) — ничего не меняется', async () => {
    for (const planned of [[], [plan({ kind: 'club' })], [plan({ status: 'done' })]]) {
      const scope = await withPlan(planned);
      await allSettled(startRequested, { scope });
      expect(scope.getState($player)).toBeNull();
      expect(scope.getState($sessionActive)).toBe(false);
    }
    expect(env.awake).toEqual([]);
  });

  it('повторный запуск посреди занятия не перезапускает его', async () => {
    const scope = await withPlan();
    await allSettled(startRequested, { scope });
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    const before = scope.getState($player);
    await allSettled(startRequested, { scope });
    expect(scope.getState($player)).toBe(before);
    expect(scope.getState($player)?.phase).toBe('work');
  });
});

describe('события и вибрация', () => {
  it('события проходят через редьюсер со временем из Date.now()', async () => {
    const scope = await withRunning(tiny(item('press-up-plank', 'program', { workSec: 15 })));
    vi.setSystemTime(new Date(`${TODAY}T10:00:10`));
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    const p = scope.getState($player)!;
    expect(p.phase).toBe('work');
    expect(p.phaseStartedAt).toBe(Date.now());
    expect(remainingMs(p, Date.now())).toBe(15_000);
  });

  it('вибрация на каждой смене фазы, а пауза и тики без смены фазы не вибрируют', async () => {
    const scope = await withRunning(tiny(item('press-up-plank', 'program', { workSec: 15 })));
    env.tap.mockClear();
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    expect(env.tap).toHaveBeenCalledTimes(1);
    await allSettled(playerEvent, { scope, params: { type: 'pause' } });
    await allSettled(playerEvent, { scope, params: { type: 'resume' } });
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    expect(env.tap).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(`${TODAY}T10:00:20`));
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    expect(scope.getState($player)?.phase).toBe('rating');
    expect(env.tap).toHaveBeenCalledTimes(2);
  });

  it('события без занятия безвредны', async () => {
    const scope = fork();
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    expect(scope.getState($player)).toBeNull();
  });
});

describe('завершение занятия', () => {
  const full = () =>
    tiny(
      item('alertness-run', 'program', { reps: 3, workSec: undefined }),
      item('toe-taps', 'ball', { workSec: 10 }),
    );

  it('естественное окончание: запись в журнал, занятие плана выполнено, экран может гаснуть', async () => {
    const scope = await withRunning(full());
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(playerEvent, { scope, params: { type: 'complete' } });
    await allSettled(playerEvent, { scope, params: { type: 'rate', rating: 5 } });
    vi.setSystemTime(new Date(`${TODAY}T10:00:06`)); // «Приготовься» 5 с
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    vi.setSystemTime(new Date(`${TODAY}T10:00:20`)); // работа 10 с
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });

    expect(scope.getState($player)?.phase).toBe('done');
    const logs = scope.getState($sessionLogs);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      sessionId: `ps-${TODAY}`,
      items: [
        { exerciseId: 'alertness-run', level: 1, setsDone: 1, techniqueRating: 5 },
        { exerciseId: 'toe-taps', level: 1, setsDone: 1 },
      ],
    });
    expect(scope.getState($plannedSessions).find((s) => s.id === `ps-${TODAY}`)?.status).toBe('done');
    expect(scope.getState($sessionActive)).toBe(false);
    expect(env.awake.at(-1)).toBe(false);
  });

  it('запись одна: повторные события после конца ничего не дублируют', async () => {
    const scope = await withRunning(tiny(item('deep-squat', 'cooldown', { workSec: 10 })));
    vi.setSystemTime(new Date(`${TODAY}T10:00:30`));
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    await allSettled(playerEvent, { scope, params: { type: 'finish' } });
    expect(scope.getState($sessionLogs)).toHaveLength(1);
  });

  it('«Засчитать и выйти» после блока А: частичный журнал и занятие выполнено', async () => {
    const scope = await withRunning(full());
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(playerEvent, { scope, params: { type: 'complete' } });
    await allSettled(endDialogOpened, { scope });
    await allSettled(endChosen, { scope, params: 'save' });
    expect(scope.getState($player)?.phase).toBe('done');
    expect(scope.getState($sessionLogs)[0]?.items).toEqual([
      { exerciseId: 'alertness-run', level: 1, setsDone: 1 },
    ]);
    expect(scope.getState($plannedSessions).find((s) => s.id === `ps-${TODAY}`)?.status).toBe('done');
    expect(scope.getState($endDialogOpen)).toBe(false);
  });

  it('если всё пропустили («Дальше»), занятие не засчитывается и в журнал ничего не пишется', async () => {
    const scope = await withRunning(tiny(item('spiderman', 'program', { workSec: 10 })));
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(playerEvent, { scope, params: { type: 'skip' } });
    await allSettled(playerEvent, { scope, params: { type: 'rate', rating: null } });
    expect(scope.getState($player)?.phase).toBe('done');
    expect(scope.getState($sessionLogs)).toEqual([]);
    expect(scope.getState($plannedSessions).find((s) => s.id === `ps-${TODAY}`)?.status).toBe('planned');
  });

  it('«Засчитать», пока блок А не пройден, ничего не делает (кнопки в интерфейсе тоже не будет)', async () => {
    const scope = await withRunning(full());
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(endChosen, { scope, params: 'save' });
    expect(scope.getState($player)?.phase).toBe('work');
    expect(scope.getState($sessionLogs)).toEqual([]);
  });

  it('«Выйти без записи»: состояние очищено, журнала нет, занятие осталось запланированным', async () => {
    const scope = await withRunning(full());
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(playerEvent, { scope, params: { type: 'complete' } });
    await allSettled(endChosen, { scope, params: 'discard' });
    expect(scope.getState($player)).toBeNull();
    expect(scope.getState($planId)).toBeNull();
    expect(scope.getState($sessionLogs)).toEqual([]);
    expect(scope.getState($plannedSessions).find((s) => s.id === `ps-${TODAY}`)?.status).toBe('planned');
    expect(env.awake.at(-1)).toBe(false);
  });
});

describe('диалог завершения', () => {
  it('пока открыт, время стоит; «Продолжить» возвращает его', async () => {
    const scope = await withRunning(tiny(item('press-up-plank', 'program', { workSec: 15 })));
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    vi.setSystemTime(new Date(`${TODAY}T10:00:05`));
    await allSettled(endDialogOpened, { scope });
    expect(scope.getState($endDialogOpen)).toBe(true);
    expect(scope.getState($player)?.pausedAt).not.toBeNull();

    vi.setSystemTime(new Date(`${TODAY}T10:05:00`)); // долго «думали»
    await allSettled(endDialogClosed, { scope });
    const p = scope.getState($player)!;
    expect(scope.getState($endDialogOpen)).toBe(false);
    expect(p.pausedAt).toBeNull();
    expect(remainingMs(p, Date.now())).toBe(10_000);
  });

  it('sessionLeft закрывает всё', async () => {
    const scope = await withRunning(tiny(item('press-up-plank', 'program')));
    await allSettled(endDialogOpened, { scope });
    await allSettled(sessionLeft, { scope });
    expect(scope.getState($player)).toBeNull();
    expect(scope.getState($endDialogOpen)).toBe(false);
  });
});

describe('уход с экрана таймера', () => {
  it('посреди занятия — пауза (время не убегает, пока ребёнок вне экрана)', async () => {
    const scope = await withRunning(tiny(item('press-up-plank', 'program', { workSec: 15 })));
    await allSettled(playerEvent, { scope, params: { type: 'begin' } });
    await allSettled(timerScreenLeft, { scope });
    expect(scope.getState($player)?.pausedAt).not.toBeNull();
  });

  it('после итогов — состояние очищается', async () => {
    const scope = await withRunning(tiny(item('deep-squat', 'cooldown', { workSec: 10 })));
    vi.setSystemTime(new Date(`${TODAY}T10:00:30`));
    await allSettled(playerEvent, { scope, params: { type: 'tick' } });
    await allSettled(timerScreenLeft, { scope });
    expect(scope.getState($player)).toBeNull();
  });

  it('когда занятия нет — ничего', async () => {
    const scope = fork();
    await allSettled(timerScreenLeft, { scope });
    expect(scope.getState($player)).toBeNull();
  });
});
