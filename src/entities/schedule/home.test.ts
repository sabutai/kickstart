import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../user-data/schema';
import { homeState, streak, weekGoal } from './home';

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

// 2026-11-04 — среда.
describe('homeState', () => {
  const today = '2026-11-04';

  it('домашняя запланированная сегодня → session', () => {
    expect(homeState([s(today)], today)).toEqual({ kind: 'session', session: s(today) });
  });

  it('мини-тест сегодня тоже session', () => {
    expect(homeState([s(today, 'planned', 'test')], today)).toMatchObject({ kind: 'session' });
  });

  it('секция сегодня → club', () => {
    expect(homeState([s(today, 'planned', 'club')], today)).toMatchObject({ kind: 'club' });
  });

  it('выполнено сегодня → done, пропущено → skipped (с ближайшим следующим)', () => {
    const next = s('2026-11-06');
    expect(homeState([s(today, 'done'), next], today)).toMatchObject({ kind: 'done', next });
    expect(homeState([s(today, 'skipped'), next], today)).toMatchObject({ kind: 'skipped', next });
  });

  it('день без занятия → rest со следующим запланированным', () => {
    const plan = [s('2026-11-03', 'done'), s('2026-11-06'), s('2026-11-09')];
    expect(homeState(plan, today)).toEqual({ kind: 'rest', next: plan[1] });
  });

  it('следующее — только запланированное: пропущенное и выполненное в будущем не считаются', () => {
    const plan = [s('2026-11-05', 'skipped'), s('2026-11-06', 'done'), s('2026-11-09')];
    expect(homeState(plan, today)).toMatchObject({ kind: 'rest', next: { date: '2026-11-09' } });
  });

  it('до старта программы — rest со стартовым занятием', () => {
    expect(homeState([s('2026-11-10')], today)).toMatchObject({ kind: 'rest', next: { date: '2026-11-10' } });
  });

  it('программа закончилась → finished', () => {
    expect(homeState([s('2026-11-01', 'done'), s('2026-11-03', 'done')], today)).toEqual({
      kind: 'finished',
    });
  });

  it('пустой план → rest без следующего', () => {
    expect(homeState([], today)).toEqual({ kind: 'rest', next: null });
  });
});

describe('weekGoal (неделя Пн–Вс)', () => {
  const plan = [
    s('2026-10-30', 'done'), // прошлая неделя
    s('2026-11-02', 'done'), // пн
    s('2026-11-03', 'done', 'club'), // вт — «Был» тоже считается
    s('2026-11-04'), // ср, сегодня
    s('2026-11-07'), // сб
    s('2026-11-09', 'done'), // следующая неделя
  ];

  it('считает выполненные и все занятия текущей недели', () => {
    expect(weekGoal(plan, '2026-11-04')).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('воскресенье относится к той же неделе, понедельник — уже к следующей', () => {
    expect(weekGoal(plan, '2026-11-08')).toMatchObject({ total: 4 });
    expect(weekGoal(plan, '2026-11-09')).toEqual({ done: 1, total: 1, ratio: 1 });
  });

  it('нет занятий на неделе — ratio 0, не NaN', () => {
    expect(weekGoal(plan, '2026-12-01')).toEqual({ done: 0, total: 0, ratio: 0 });
    expect(weekGoal([], '2026-11-04')).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('работает через границу года', () => {
    const p = [s('2026-12-31', 'done'), s('2027-01-02', 'done'), s('2027-01-03')];
    expect(weekGoal(p, '2027-01-01')).toEqual({ done: 2, total: 3, ratio: 2 / 3 });
  });
});

describe('streak (подряд выполненные запланированные занятия)', () => {
  const today = '2026-11-10';

  it('считает выполненные подряд от последнего прошедшего', () => {
    const plan = [
      s('2026-11-03', 'done'),
      s('2026-11-05', 'done', 'club'),
      s('2026-11-07', 'done'),
      s('2026-11-12'),
    ];
    expect(streak(plan, today)).toBe(3);
  });

  it('пропуск обрывает серию', () => {
    const plan = [
      s('2026-11-03', 'done'),
      s('2026-11-05', 'skipped'),
      s('2026-11-07', 'done'),
      s('2026-11-09', 'done'),
    ];
    expect(streak(plan, today)).toBe(2);
  });

  it('прошедшее неотмеченное занятие обрывает серию', () => {
    const plan = [s('2026-11-03', 'done'), s('2026-11-05'), s('2026-11-07', 'done')];
    expect(streak(plan, today)).toBe(1);
  });

  it('сегодняшнее ещё не выполненное не обрывает серию и не прибавляет', () => {
    const plan = [s('2026-11-05', 'done'), s('2026-11-07', 'done'), s('2026-11-10')];
    expect(streak(plan, today)).toBe(2);
  });

  it('сегодняшнее выполненное прибавляет, пропущенное — обрывает', () => {
    const base = [s('2026-11-05', 'done'), s('2026-11-07', 'done')];
    expect(streak([...base, s('2026-11-10', 'done')], today)).toBe(3);
    expect(streak([...base, s('2026-11-10', 'skipped')], today)).toBe(0);
  });

  it('будущие занятия не учитываются, пустой план — 0, дни отдыха серию не рвут', () => {
    expect(streak([s('2026-11-12', 'done')], today)).toBe(0);
    expect(streak([], today)).toBe(0);
    // между занятиями есть пустые дни — считаются только запланированные занятия, а не дни
    expect(streak([s('2026-11-02', 'done'), s('2026-11-09', 'done')], today)).toBe(2);
  });

  it('порядок в массиве не важен', () => {
    const plan = [s('2026-11-07', 'done'), s('2026-11-03', 'skipped'), s('2026-11-09', 'done')];
    expect(streak(plan, today)).toBe(2);
  });
});
