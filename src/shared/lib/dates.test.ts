import { describe, expect, it } from 'vitest';
import { buildMonthGrid, isoWeekday, monthOf, shiftMonth, toDate, toKey } from './dates';

describe('даты', () => {
  it('toDate/toKey обратимы, isoWeekday: пн = 1, вс = 7', () => {
    expect(toKey(toDate('2026-11-08'))).toBe('2026-11-08');
    expect(isoWeekday(toDate('2026-11-02'))).toBe(1);
    expect(isoWeekday(toDate('2026-11-08'))).toBe(7);
  });

  it('monthOf и shiftMonth, в том числе через границу года', () => {
    expect(monthOf('2026-11-08')).toBe('2026-11');
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
  });
});

describe('buildMonthGrid', () => {
  it('ноябрь 2026: 6 недель (1-е — воскресенье, 30-е — понедельник), с 26 октября по 6 декабря', () => {
    const grid = buildMonthGrid('2026-11');
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]![0]).toEqual({ date: '2026-10-26', day: 26, inMonth: false });
    expect(grid[0]![6]).toEqual({ date: '2026-11-01', day: 1, inMonth: true });
    expect(grid[5]![6]).toEqual({ date: '2026-12-06', day: 6, inMonth: false });
  });

  it('октябрь 2026 — как в макете: с 28 сентября по 1 ноября, 5 строк', () => {
    const grid = buildMonthGrid('2026-10');
    expect(grid).toHaveLength(5);
    expect(grid[0]![0]!.date).toBe('2026-09-28');
    expect(grid[4]![6]!.date).toBe('2026-11-01');
  });

  it('бывает 6 строк: август 2026 (1-е — суббота, 31-е — понедельник)', () => {
    const grid = buildMonthGrid('2026-08');
    expect(grid).toHaveLength(6);
    expect(grid[5]![0]).toMatchObject({ date: '2026-08-31', inMonth: true });
  });

  it('февраль 2027 ровно в 4 недели: 1 февраля — понедельник, 28-е — воскресенье', () => {
    const grid = buildMonthGrid('2027-02');
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((c) => c.inMonth)).toBe(true);
  });

  it('все даты подряд без пропусков и дублей (включая перевод часов)', () => {
    const dates = buildMonthGrid('2026-10')
      .flat()
      .map((c) => c.date);
    expect(new Set(dates).size).toBe(dates.length);
    for (let i = 1; i < dates.length; i++) {
      const diff = (toDate(dates[i]!).getTime() - toDate(dates[i - 1]!).getTime()) / 86_400_000;
      expect(Math.round(diff)).toBe(1);
    }
  });

  it('високосный февраль 2028: 29 дней в месяце', () => {
    expect(
      buildMonthGrid('2028-02')
        .flat()
        .filter((c) => c.inMonth),
    ).toHaveLength(29);
  });
});
