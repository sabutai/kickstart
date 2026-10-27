import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../../test/sqljs-db';
import { migrate } from '../../shared/lib/db/migrations';
import { createUserDataRepositories, type UserDataRepositories } from './repositories';

let repos: UserDataRepositories;

beforeEach(async () => {
  const db = await createTestDb();
  await migrate(db);
  repos = createUserDataRepositories(db, () => '2026-11-02T10:00:00.000Z');
});

describe('репозитории пользовательских данных', () => {
  it('профиль: сохраняется и читается', async () => {
    await repos.profiles.save({ id: 'p1', name: 'Тимур', age: 8, lang: 'ru', mode: 'child' });
    expect(await repos.profiles.get('p1')).toMatchObject({ name: 'Тимур', mode: 'child' });
  });

  it('расписание: сохраняется и читается', async () => {
    await repos.schedules.save({
      id: 's1',
      startDate: '2026-11-02',
      clubDays: [2, 4],
      homeDays: [1, 3, 6],
      weeks: 12,
    });
    expect((await repos.schedules.list())[0]).toMatchObject({ clubDays: [2, 4], weeks: 12 });
  });

  it('занятия плана: выборка по диапазону дат', async () => {
    for (const date of ['2026-11-02', '2026-11-04', '2026-11-09']) {
      await repos.plannedSessions.save({ id: `ps-${date}`, date, stage: 1, kind: 'home', status: 'planned' });
    }
    const week = await repos.plannedSessions.listByKeyRange('2026-11-02', '2026-11-08');
    expect(week.map((s) => s.date)).toEqual(['2026-11-02', '2026-11-04']);
  });

  it('журнал: ключ — день начала, поэтому находится по дате', async () => {
    await repos.sessionLogs.save({
      id: 'l1',
      sessionId: 'ps-2026-11-02',
      startedAt: '2026-11-02T16:00:00.000Z',
      items: [{ exerciseId: 'spiderman', level: 1, setsDone: 3, techniqueRating: 5 }],
    });
    expect(await repos.sessionLogs.findByKey('2026-11-02')).toHaveLength(1);
    expect(await repos.sessionLogs.findByKey('2026-11-03')).toHaveLength(0);
  });

  it('прогресс упражнения: находится по exerciseId', async () => {
    await repos.exerciseProgress.save({
      id: 'e1',
      exerciseId: 'skating-jumps',
      level: 2,
      cleanSessionsInRow: 1,
    });
    expect(await repos.exerciseProgress.findByKey('skating-jumps')).toHaveLength(1);
  });

  it('мини-тест: сохраняется с частичными метриками', async () => {
    await repos.miniTests.save({ id: 't1', date: '2026-11-02', soleTaps30s: 38 });
    expect(await repos.miniTests.findByKey('2026-11-02')).toMatchObject([{ soleTaps30s: 38 }]);
  });
});
