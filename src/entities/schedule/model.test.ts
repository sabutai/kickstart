import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import {
  $plannedSessions,
  $schedule,
  loadPlannedSessionsFx,
  loadScheduleFx,
  plannedSessionsSaved,
  scheduleSaved,
} from './model';

const schedule = { startDate: '2026-11-02', clubDays: [2, 4], homeDays: [1, 3, 6], weeks: 12 };
const session = (date: string, over = {}) => ({
  id: `ps-${date}`,
  date,
  stage: 1 as const,
  kind: 'home' as const,
  status: 'planned' as const,
  ...over,
});

beforeEach(async () => {
  env.db = await freshDb();
});

describe('стор расписания', () => {
  it('пока ничего нет — null и пустой список', async () => {
    const scope = fork();
    await allSettled(loadScheduleFx, { scope });
    await allSettled(loadPlannedSessionsFx, { scope });
    expect(scope.getState($schedule)).toBeNull();
    expect(scope.getState($plannedSessions)).toEqual([]);
  });

  it('scheduleSaved сохраняет, переживает перезапуск и не плодит дубли', async () => {
    const scope = fork();
    await allSettled(scheduleSaved, { scope, params: schedule });
    const id = scope.getState($schedule)!.id;
    await allSettled(scheduleSaved, { scope, params: { ...schedule, homeDays: [1, 3] } });
    expect(scope.getState($schedule)).toMatchObject({ id, homeDays: [1, 3] });

    const fresh = fork();
    await allSettled(loadScheduleFx, { scope: fresh });
    expect(fresh.getState($schedule)).toEqual(scope.getState($schedule));
    expect(await env.db!.query('SELECT id FROM schedule')).toHaveLength(1);
  });

  it('невалидное расписание (день и в секции, и дома) отклоняется', async () => {
    const scope = fork();
    await allSettled(scheduleSaved, { scope, params: { ...schedule, homeDays: [2, 3] } });
    expect(scope.getState($schedule)).toBeNull();
  });

  it('занятия плана сохраняются пачкой и держатся отсортированными по дате', async () => {
    const scope = fork();
    await allSettled(plannedSessionsSaved, {
      scope,
      params: [session('2026-11-09'), session('2026-11-03'), session('2026-11-06')],
    });
    expect(scope.getState($plannedSessions).map((s) => s.date)).toEqual([
      '2026-11-03',
      '2026-11-06',
      '2026-11-09',
    ]);

    const fresh = fork();
    await allSettled(loadPlannedSessionsFx, { scope: fresh });
    expect(fresh.getState($plannedSessions).map((s) => s.date)).toEqual([
      '2026-11-03',
      '2026-11-06',
      '2026-11-09',
    ]);
  });

  it('повторное сохранение того же id обновляет занятие (например, отметку «сделано»)', async () => {
    const scope = fork();
    await allSettled(plannedSessionsSaved, { scope, params: [session('2026-11-03'), session('2026-11-06')] });
    await allSettled(plannedSessionsSaved, { scope, params: [session('2026-11-03', { status: 'done' })] });
    const list = scope.getState($plannedSessions);
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.date === '2026-11-03')?.status).toBe('done');
  });

  it('пачка с ошибкой в одном занятии не оставляет стор в полусохранённом виде', async () => {
    const scope = fork();
    await allSettled(plannedSessionsSaved, {
      scope,
      params: [session('2026-11-03'), session('не дата')],
    });
    expect(scope.getState($plannedSessions)).toEqual([]);
    expect(await env.db!.query('SELECT id FROM planned_session')).toHaveLength(0);
  });
});
