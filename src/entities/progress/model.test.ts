import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import {
  $exerciseLevels,
  $exerciseProgress,
  $miniTests,
  $sessionLogs,
  exerciseProgressSaved,
  loadProgressFx,
  miniTestSaved,
  sessionLogged,
} from './model';

beforeEach(async () => {
  env.db = await freshDb();
});

describe('стор прогресса', () => {
  it('пусто: нет записей, уровень любого упражнения = 1', async () => {
    const scope = fork();
    await allSettled(loadProgressFx, { scope });
    expect(scope.getState($exerciseProgress)).toEqual({});
    expect(scope.getState($sessionLogs)).toEqual([]);
    expect(scope.getState($miniTests)).toEqual([]);
    expect(scope.getState($exerciseLevels)('skating-jumps')).toBe(1);
  });

  it('прогресс упражнения: одна запись на упражнение, переживает перезапуск', async () => {
    const scope = fork();
    await allSettled(exerciseProgressSaved, {
      scope,
      params: { exerciseId: 'skating-jumps', level: 1, cleanSessionsInRow: 1 },
    });
    const id = scope.getState($exerciseProgress)['skating-jumps']!.id;
    await allSettled(exerciseProgressSaved, {
      scope,
      params: { exerciseId: 'skating-jumps', level: 2, cleanSessionsInRow: 0 },
    });
    expect(scope.getState($exerciseProgress)['skating-jumps']).toMatchObject({ id, level: 2 });
    expect(scope.getState($exerciseLevels)('skating-jumps')).toBe(2);
    expect(scope.getState($exerciseLevels)('spiderman')).toBe(1);
    expect(await env.db!.query('SELECT id FROM exercise_progress')).toHaveLength(1);

    const fresh = fork();
    await allSettled(loadProgressFx, { scope: fresh });
    expect(fresh.getState($exerciseLevels)('skating-jumps')).toBe(2);
  });

  it('разные упражнения хранятся независимо', async () => {
    const scope = fork();
    await allSettled(exerciseProgressSaved, {
      scope,
      params: { exerciseId: 'a', level: 3, cleanSessionsInRow: 1 },
    });
    await allSettled(exerciseProgressSaved, {
      scope,
      params: { exerciseId: 'b', level: 1, cleanSessionsInRow: 0 },
    });
    expect(Object.keys(scope.getState($exerciseProgress)).sort()).toEqual(['a', 'b']);
  });

  it('журнал тренировок: добавляется и читается в порядке времени', async () => {
    const scope = fork();
    const log = (startedAt: string) => ({
      sessionId: 'ps-1',
      startedAt,
      items: [{ exerciseId: 'spiderman', level: 1, setsDone: 3, techniqueRating: 5 }],
    });
    await allSettled(sessionLogged, { scope, params: log('2026-11-05T16:00:00.000Z') });
    await allSettled(sessionLogged, { scope, params: log('2026-11-03T16:00:00.000Z') });
    expect(scope.getState($sessionLogs).map((l) => l.startedAt)).toEqual([
      '2026-11-03T16:00:00.000Z',
      '2026-11-05T16:00:00.000Z',
    ]);
    const fresh = fork();
    await allSettled(loadProgressFx, { scope: fresh });
    expect(fresh.getState($sessionLogs)).toHaveLength(2);
  });

  it('мини-тесты: сохраняются с частичными метриками, сортируются по дате', async () => {
    const scope = fork();
    await allSettled(miniTestSaved, { scope, params: { date: '2026-11-30', soleTaps30s: 45 } });
    await allSettled(miniTestSaved, {
      scope,
      params: { date: '2026-11-02', soleTaps30s: 38, snailSec: 24.5 },
    });
    expect(scope.getState($miniTests).map((t) => t.date)).toEqual(['2026-11-02', '2026-11-30']);
  });

  it('невалидная запись журнала не попадает ни в стор, ни в БД', async () => {
    const scope = fork();
    await allSettled(sessionLogged, {
      scope,
      params: { sessionId: 'x', startedAt: 'вчера', items: [] },
    });
    expect(scope.getState($sessionLogs)).toEqual([]);
    expect(await env.db!.query('SELECT id FROM session_log')).toHaveLength(0);
  });
});
