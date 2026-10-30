import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../../entities/user-data/schema';
import { dayStatus, monthRange } from './stats';

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
