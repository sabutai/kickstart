import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../../entities/user-data/schema';
import { dayStatus, monthRange, monthStats } from './stats';

const s = (
  date: string,
  status: PlannedSession['status'] = 'planned',
  kind: PlannedSession['kind'] = 'home',
): PlannedSession => ({
  id: `ps-${date}`,
  updatedAt: '2026-11-01T00:00:00.000Z',
  date,
  stage: 1,
  kind,
  status,
});

describe('dayStatus', () => {
  it('нет занятия — none, иначе статус занятия', () => {
    expect(dayStatus(undefined)).toBe('none');
    expect(dayStatus(s('2026-11-03', 'planned'))).toBe('planned');
    expect(dayStatus(s('2026-11-03', 'done'))).toBe('done');
    expect(dayStatus(s('2026-11-03', 'skipped'))).toBe('skipped');
  });
});

describe('monthStats', () => {
  const plan = [
    s('2026-10-30', 'done'), // другой месяц
    s('2026-11-03', 'done'),
    s('2026-11-05', 'done', 'club'),
    s('2026-11-07', 'skipped'),
    s('2026-11-10', 'planned'),
    s('2026-11-12', 'planned'),
    s('2026-12-01', 'planned'),
  ];

  it('считает занятия месяца и долю выполненных среди наступивших', () => {
    // сегодня 10 ноября: наступили 03, 05, 07, 10 → выполнено 2 из 4
    expect(monthStats(plan, '2026-11', '2026-11-10')).toEqual({ total: 5, due: 4, done: 2, percent: 50 });
  });

  it('сегодняшнее занятие считается наступившим, завтрашнее — нет', () => {
    expect(monthStats(plan, '2026-11', '2026-11-09').due).toBe(3);
    expect(monthStats(plan, '2026-11', '2026-11-10').due).toBe(4);
  });

  it('пока ничего не наступило — процента нет (null), а не 0 или NaN', () => {
    expect(monthStats(plan, '2026-12', '2026-11-10')).toEqual({ total: 1, due: 0, done: 0, percent: null });
    expect(monthStats([], '2026-11', '2026-11-10')).toEqual({ total: 0, due: 0, done: 0, percent: null });
  });

  it('проценты округляются', () => {
    const three = [s('2026-11-02', 'done'), s('2026-11-03', 'skipped'), s('2026-11-04', 'skipped')];
    expect(monthStats(three, '2026-11', '2026-11-30').percent).toBe(33);
  });
});

describe('monthRange', () => {
  it('от месяца первого занятия до месяца последнего', () => {
    expect(monthRange([s('2026-11-03'), s('2027-01-23')], '2026-11')).toEqual({
      first: '2026-11',
      last: '2027-01',
    });
  });

  it('пустой план — только текущий месяц', () => {
    expect(monthRange([], '2026-11')).toEqual({ first: '2026-11', last: '2026-11' });
  });

  it('работает, даже если занятия пришли не по порядку', () => {
    expect(monthRange([s('2027-01-23'), s('2026-11-03')], '2026-11')).toEqual({
      first: '2026-11',
      last: '2027-01',
    });
  });
});
