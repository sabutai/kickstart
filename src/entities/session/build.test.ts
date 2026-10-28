import { describe, expect, it } from 'vitest';
import { program } from '../../content';
import { buildSession, type SessionItem } from './build';

const levels =
  (map: Record<string, number> = {}) =>
  (id: string) =>
    map[id] ?? 1;
const build = (week: number, rotation = 0, map: Record<string, number> = {}) =>
  buildSession({ program, week, rotation, levelOf: levels(map) });
const ids = (items: SessionItem[]) => items.map((i) => i.exercise.id);
const part = (s: ReturnType<typeof build>, kind: SessionItem['partKind']) =>
  s.items.filter((i) => i.partKind === kind);

describe('buildSession: состав и порядок', () => {
  const s = build(1);

  it('части идут в порядке шаблона занятия', () => {
    expect(s.parts).toEqual(['game', 'program', 'ball', 'feet', 'cooldown']);
    const order = s.items.map((i) => i.partKind);
    expect(order).toEqual([...order].sort((a, b) => s.parts.indexOf(a) - s.parts.indexOf(b)));
  });

  it('часть 1: одна игра на реакцию', () => {
    expect(part(s, 'game')).toHaveLength(1);
    expect(part(s, 'game')[0]!.exercise.partKinds).toContain('game');
  });

  it('часть 2: все 7 упражнений блока А строго по порядку программы', () => {
    expect(ids(part(s, 'program'))).toEqual([
      'alertness-run',
      'skating-jumps',
      'single-leg-stance',
      'press-up-plank',
      'single-leg-hops',
      'spiderman',
      'sideways-roll',
    ]);
  });

  it('часть 5: финальная игра, затем вся мобильность; растяжка бедра — в самом конце', () => {
    const cooldown = part(s, 'cooldown');
    expect(cooldown[0]!.exercise.category).toBe('games');
    expect(cooldown.slice(1).every((i) => i.exercise.category === 'mobility')).toBe(true);
    expect(cooldown).toHaveLength(1 + 6);
    expect(cooldown.at(-1)!.exercise.id).toBe('hamstring-reach');
  });

  it('детерминирован: те же входные данные — то же занятие', () => {
    expect(ids(build(6, 3).items)).toEqual(ids(build(6, 3).items));
  });
});

describe('buildSession: уровни блока А', () => {
  it('берёт текущий уровень ребёнка, по умолчанию 1', () => {
    const items = part(build(1, 0, { 'skating-jumps': 3 }), 'program');
    expect(items.find((i) => i.exercise.id === 'skating-jumps')!.level).toBe(3);
    expect(items.find((i) => i.exercise.id === 'spiderman')!.level).toBe(1);
  });

  it('дома не выше безопасного уровня: перекат не выше 3, даже если прогресс 5', () => {
    const roll = part(build(10, 0, { 'sideways-roll': 5 }), 'program').find(
      (i) => i.exercise.id === 'sideways-roll',
    )!;
    expect(roll.level).toBe(3);
    expect(roll.volume.reps).toBe(5);
  });

  it('уровень вне диапазона не ломает сборку', () => {
    const items = part(build(1, 0, { spiderman: 99, 'skating-jumps': 0 }), 'program');
    expect(items.find((i) => i.exercise.id === 'spiderman')!.level).toBe(5);
    expect(items.find((i) => i.exercise.id === 'skating-jumps')!.level).toBe(1);
  });
});

describe('buildSession: прогрессия блоков Б и В по неделям', () => {
  it('недели 1–4: блок Б — 4 базовых упражнения, блок В — только 2 из 3 без мяча', () => {
    for (const week of [1, 4]) {
      const s = build(week);
      expect(ids(part(s, 'ball')).sort()).toEqual(['inside-outside', 'pendulum', 'sole-rolls', 'toe-taps']);
      const feet = ids(part(s, 'feet'));
      expect(feet).toHaveLength(2);
      for (const id of feet) expect(['ladder', 'line-hops', 'fast-feet']).toContain(id);
    }
  });

  it('недели 5–8: в блок Б добавляются 3 упражнения, wall-pass ещё закрыт; в блоке В — fake-burst и ladder-ball', () => {
    const seenBall = new Set<string>();
    const seenFeet = new Set<string>();
    for (let rotation = 0; rotation < 10; rotation++) {
      const s = build(5, rotation);
      expect(part(s, 'ball')).toHaveLength(4);
      ids(part(s, 'ball')).forEach((id) => seenBall.add(id));
      ids(part(s, 'feet')).forEach((id) => seenFeet.add(id));
    }
    expect(seenBall).toEqual(
      new Set(['toe-taps', 'sole-rolls', 'pendulum', 'inside-outside', 'roll-stop', 'snail', 'stop-turn']),
    );
    expect(seenBall.has('wall-pass')).toBe(false);
    expect(seenFeet).toEqual(new Set(['ladder', 'line-hops', 'fast-feet', 'fake-burst', 'ladder-ball']));
  });

  it('недели 9–12: открыты все 8 упражнений блока Б', () => {
    const seen = new Set<string>();
    for (let rotation = 0; rotation < 10; rotation++)
      ids(part(build(9, rotation), 'ball')).forEach((id) => seen.add(id));
    expect(seen.size).toBe(8);
    expect(seen.has('wall-pass')).toBe(true);
  });

  it('в первые 4 недели никогда не попадает то, что открывается позже', () => {
    for (let week = 1; week <= 4; week++) {
      for (let rotation = 0; rotation < 8; rotation++) {
        for (const item of build(week, rotation).items)
          expect(item.exercise.fromWeek ?? 1).toBeLessThanOrEqual(week);
      }
    }
  });

  it('ротация меняет выбор, но не повторяет упражнение внутри занятия', () => {
    const a = ids(part(build(9, 0), 'ball'));
    const b = ids(part(build(9, 1), 'ball'));
    expect(a).not.toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(new Set(ids(part(build(9, 5), 'feet'))).size).toBe(2);
  });

  it('игра на реакцию по кругу: за 4 занятия встречаются все 4', () => {
    const games = new Set(Array.from({ length: 4 }, (_, r) => ids(part(build(1, r), 'game'))[0]));
    expect(games.size).toBe(4);
  });

  it('финальная игра тоже ротируется (3 варианта)', () => {
    const finals = new Set(
      Array.from({ length: 3 }, (_, r) => part(build(1, r), 'cooldown')[0]!.exercise.id),
    );
    expect(finals.size).toBe(3);
  });
});

describe('buildSession: объём', () => {
  it('время работы: нижняя граница диапазона в недели 1–4, верхняя — с 5-й', () => {
    const toe = (w: number) =>
      part(build(w), 'ball').find((i) => i.exercise.id === 'toe-taps')!.volume.workSec;
    expect(toe(1)).toBe(30);
    expect(toe(4)).toBe(30);
    expect(toe(5)).toBe(45);
    expect(toe(12)).toBe(45);
  });

  it('одиночное время без диапазона не меняется', () => {
    const plank = part(build(8), 'program').find((i) => i.exercise.id === 'press-up-plank')!;
    expect(plank.volume.workSec).toBe(15);
  });

  it('объём блока Б — 2 подхода, В — 3, отдых из данных', () => {
    const s = build(1);
    for (const i of part(s, 'ball')) expect(i.volume).toMatchObject({ sets: 2, restSec: 20 });
    for (const i of part(s, 'feet')) expect(i.volume).toMatchObject({ sets: 3, restSec: 30 });
  });

  it('perSide и повторы переносятся из данных', () => {
    const jumps = part(build(1), 'program').find((i) => i.exercise.id === 'skating-jumps')!;
    expect(jumps.volume).toEqual({ sets: 2, reps: 5, workSec: undefined, perSide: true, restSec: 30 });
  });

  it('у каждого упражнения есть либо повторы, либо время', () => {
    for (let week = 1; week <= 12; week++) {
      for (const i of build(week, week).items) {
        expect(
          i.volume.reps !== undefined || i.volume.workSec !== undefined,
          `${i.exercise.id} w${week}`,
        ).toBe(true);
        expect(i.volume.sets).toBeGreaterThan(0);
      }
    }
  });
});

describe('buildSession: граничные недели', () => {
  it('неделя меньше 1 и больше 12 не ломает сборку', () => {
    expect(build(0).items.length).toBeGreaterThan(0);
    expect(ids(build(0).items)).toEqual(ids(build(1).items));
    expect(build(20).items.length).toBeGreaterThan(0);
  });

  it('отрицательная ротация не даёт undefined', () => {
    for (const i of build(1, -3).items) expect(i.exercise).toBeDefined();
  });
});
