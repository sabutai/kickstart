import { describe, expect, it } from 'vitest';
import type { PlannedSession, Schedule } from '../user-data/schema';
import { startPlayer } from './start';

const stamp = '2026-11-01T00:00:00.000Z';
const s = (date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `ps-${date}`,
  updatedAt: stamp,
  date,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});
const schedule: Schedule = {
  id: 'sch',
  updatedAt: stamp,
  startDate: '2026-11-02',
  clubDays: [],
  homeDays: [2, 4, 6],
  weeks: 12,
};
const levelOf = () => 1;

describe('startPlayer', () => {
  it('сегодняшнее запланированное домашнее занятие → плеер и id занятия плана', () => {
    const r = startPlayer({ plan: [s('2026-11-03')], schedule, levelOf, today: '2026-11-03', now: 1000 });
    expect(r?.planId).toBe('ps-2026-11-03');
    expect(r?.player.startedAt).toBe(1000);
    expect(r?.player.session.items.length).toBeGreaterThan(10);
    expect(r?.player.session.parts).toEqual(['game', 'program', 'ball', 'feet', 'cooldown']);
  });

  it('мини-тест пока идёт как обычное занятие', () => {
    expect(
      startPlayer({
        plan: [s('2026-11-03', { kind: 'test' })],
        schedule,
        levelOf,
        today: '2026-11-03',
        now: 0,
      }),
    ).not.toBeNull();
  });

  it('нет занятия сегодня, секция, выполнено, пропущено — запускать нечего', () => {
    const run = (plan: PlannedSession[]) =>
      startPlayer({ plan, schedule, levelOf, today: '2026-11-03', now: 0 });
    expect(run([])).toBeNull();
    expect(run([s('2026-11-05')])).toBeNull();
    expect(run([s('2026-11-03', { kind: 'club' })])).toBeNull();
    expect(run([s('2026-11-03', { status: 'done' })])).toBeNull();
    expect(run([s('2026-11-03', { status: 'skipped' })])).toBeNull();
  });

  it('неделя считается от старта программы: на 5-й неделе доступны упражнения с 5-й недели', () => {
    const plan = [s('2026-11-30')]; // понедельник 5-й недели
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const before = Array.from({ length: i }, (_, k) => s(`2026-11-0${k + 1}`));
      const r = startPlayer({ plan: [...before, ...plan], schedule, levelOf, today: '2026-11-30', now: 0 });
      r?.player.session.items.filter((x) => x.partKind === 'ball').forEach((x) => seen.add(x.exercise.id));
    }
    expect([...seen].some((id) => ['roll-stop', 'snail', 'stop-turn'].includes(id))).toBe(true);
    expect(seen.has('wall-pass')).toBe(false);
  });

  it('ротация зависит от числа прошедших домашних занятий: разные игры в разные дни', () => {
    const game = (n: number) => {
      const before = Array.from({ length: n }, (_, k) => s(`2026-11-0${k + 1}`));
      const r = startPlayer({
        plan: [...before, s('2026-11-09')],
        schedule,
        levelOf,
        today: '2026-11-09',
        now: 0,
      });
      return r!.player.session.items[0]!.exercise.id;
    };
    expect(new Set([game(0), game(1), game(2), game(3)]).size).toBe(4);
  });

  it('занятия секции не сдвигают ротацию', () => {
    const run = (extra: PlannedSession[]) =>
      startPlayer({ plan: [...extra, s('2026-11-09')], schedule, levelOf, today: '2026-11-09', now: 0 })!
        .player.session.items[0]!.exercise.id;
    expect(run([s('2026-11-03', { kind: 'club' }), s('2026-11-05', { kind: 'club' })])).toBe(run([]));
  });

  it('без расписания (редкий сбой) — считаем первой неделей', () => {
    expect(
      startPlayer({ plan: [s('2026-11-03')], schedule: null, levelOf, today: '2026-11-03', now: 0 }),
    ).not.toBeNull();
  });

  it('уровни ребёнка попадают в занятие', () => {
    const r = startPlayer({
      plan: [s('2026-11-03')],
      schedule,
      levelOf: (id) => (id === 'spiderman' ? 4 : 1),
      today: '2026-11-03',
      now: 0,
    });
    expect(r!.player.session.items.find((i) => i.exercise.id === 'spiderman')!.level).toBe(4);
  });
});
