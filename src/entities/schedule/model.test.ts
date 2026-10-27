import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, createWatch, fork } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import {
  $plannedSessions,
  sessionActionRejected,
  sessionDone,
  sessionMovedToSunday,
  sessionSkipped,
  sessionStatusReset,
  $schedule,
  loadPlannedSessionsFx,
  loadScheduleFx,
  plannedSessionsSaved,
  replacePlannedSessionsFx,
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

describe('действия над занятиями', () => {
  // 2026-11-07 — суббота, 2026-11-08 — воскресенье.
  const seed = async (list: ReturnType<typeof session>[], today = '2026-11-07T12:00:00') => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(today));
    const scope = fork();
    await allSettled(plannedSessionsSaved, { scope, params: list });
    return scope;
  };
  const rejections = (scope: ReturnType<typeof fork>) => {
    const log: { id: string; reason: string }[] = [];
    createWatch({ unit: sessionActionRejected, fn: (r) => log.push(r), scope });
    return log;
  };
  const statusOf = (scope: ReturnType<typeof fork>, id: string) =>
    scope.getState($plannedSessions).find((s) => s.id === id)?.status;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('«выполнено» сохраняется в БД и переживает перезапуск', async () => {
    const scope = await seed([session('2026-11-07')]);
    await allSettled(sessionDone, { scope, params: { id: 'ps-2026-11-07' } });
    expect(statusOf(scope, 'ps-2026-11-07')).toBe('done');

    const fresh = fork();
    await allSettled(loadPlannedSessionsFx, { scope: fresh });
    expect(statusOf(fresh, 'ps-2026-11-07')).toBe('done');
  });

  it('будущее занятие отметить нельзя — отказ с причиной, стор не меняется', async () => {
    const scope = await seed([session('2026-11-09')]);
    const log = rejections(scope);
    await allSettled(sessionDone, { scope, params: { id: 'ps-2026-11-09' } });
    expect(statusOf(scope, 'ps-2026-11-09')).toBe('planned');
    expect(log).toEqual([{ id: 'ps-2026-11-09', reason: 'future' }]);
  });

  it('пропуск не сдвигает остальные занятия, отмена возвращает «запланировано»', async () => {
    const scope = await seed([session('2026-11-09'), session('2026-11-11')]);
    await allSettled(sessionSkipped, { scope, params: { id: 'ps-2026-11-09' } });
    expect(statusOf(scope, 'ps-2026-11-09')).toBe('skipped');
    expect(scope.getState($plannedSessions).map((s) => s.date)).toEqual(['2026-11-09', '2026-11-11']);
    await allSettled(sessionStatusReset, { scope, params: { id: 'ps-2026-11-09' } });
    expect(statusOf(scope, 'ps-2026-11-09')).toBe('planned');
  });

  it('перенос сб → вс: дата меняется, id сохраняется, movedFrom заполнен, порядок пересортирован', async () => {
    const scope = await seed([session('2026-11-07'), session('2026-11-09')]);
    await allSettled(sessionMovedToSunday, { scope, params: { id: 'ps-2026-11-07' } });
    const moved = scope.getState($plannedSessions).find((s) => s.id === 'ps-2026-11-07');
    expect(moved).toMatchObject({ date: '2026-11-08', movedFrom: '2026-11-07', status: 'planned' });
    expect(scope.getState($plannedSessions).map((s) => s.date)).toEqual(['2026-11-08', '2026-11-09']);

    const fresh = fork();
    await allSettled(loadPlannedSessionsFx, { scope: fresh });
    expect(fresh.getState($plannedSessions).find((s) => s.id === 'ps-2026-11-07')?.date).toBe('2026-11-08');
  });

  it('перенос на занятое воскресенье отклоняется', async () => {
    const scope = await seed([session('2026-11-07'), session('2026-11-08', { kind: 'club' })]);
    const log = rejections(scope);
    await allSettled(sessionMovedToSunday, { scope, params: { id: 'ps-2026-11-07' } });
    expect(log).toEqual([{ id: 'ps-2026-11-07', reason: 'sunday-occupied' }]);
    expect(scope.getState($plannedSessions).find((s) => s.id === 'ps-2026-11-07')?.date).toBe('2026-11-07');
  });

  it('неизвестный id — отказ not-found', async () => {
    const scope = await seed([]);
    const log = rejections(scope);
    await allSettled(sessionSkipped, { scope, params: { id: 'нет-такого' } });
    expect(log).toEqual([{ id: 'нет-такого', reason: 'not-found' }]);
  });
});

describe('замена плана', () => {
  it('лишние занятия удаляются, общие обновляются, новые добавляются', async () => {
    const scope = fork();
    await allSettled(plannedSessionsSaved, {
      scope,
      params: [session('2026-11-03'), session('2026-11-06'), session('2026-11-09')],
    });
    await allSettled(replacePlannedSessionsFx, {
      scope,
      params: [session('2026-11-06', { status: 'done' }), session('2026-11-10')],
    });
    expect(scope.getState($plannedSessions).map((s) => [s.date, s.status])).toEqual([
      ['2026-11-06', 'done'],
      ['2026-11-10', 'planned'],
    ]);

    const fresh = fork();
    await allSettled(loadPlannedSessionsFx, { scope: fresh });
    expect(fresh.getState($plannedSessions).map((s) => s.date)).toEqual(['2026-11-06', '2026-11-10']);
  });

  it('невалидный новый план ничего не стирает', async () => {
    const scope = fork();
    await allSettled(plannedSessionsSaved, { scope, params: [session('2026-11-03')] });
    await allSettled(replacePlannedSessionsFx, { scope, params: [session('не дата')] });
    expect(scope.getState($plannedSessions).map((s) => s.date)).toEqual(['2026-11-03']);
  });
});
