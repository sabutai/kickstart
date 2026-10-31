/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exercises, getExercise, program } from './index';

const blockA = [
  'alertness-run',
  'skating-jumps',
  'single-leg-stance',
  'press-up-plank',
  'single-leg-hops',
  'spiderman',
  'sideways-roll',
];

const byPart = (kind: string) => exercises.filter((e) => e.partKinds.includes(kind as never));

describe('программа (docs/program.md)', () => {
  it('блок А: 7 упражнений × 5 уровней в порядке программы', () => {
    const a = byPart('program');
    expect(a.map((e) => e.id)).toEqual(blockA);
    for (const e of a) expect(e.levels).toHaveLength(5);
  });

  it('блок А: у каждого есть «Зачем», исходное положение, ошибки и команда', () => {
    for (const e of byPart('program')) {
      expect(e.why, e.id).toBeDefined();
      expect(e.setup, e.id).toBeDefined();
      expect(e.mistakes, e.id).toBeDefined();
      expect(e.cue, e.id).toBeDefined();
    }
  });

  it('перекат вбок: дома не выше уровня 3 и только на мате', () => {
    expect(getExercise('sideways-roll')?.safety).toEqual({ homeMaxLevel: 3, needsMat: true });
    const others = byPart('program').filter((e) => e.id !== 'sideways-roll');
    for (const e of others) expect(e.safety, e.id).toBeUndefined();
  });

  it('отдых между подходами в блоке А — 30 с (решение владельца)', () => {
    for (const e of byPart('program')) for (const l of e.levels) expect(l.volume.restSec).toBe(30);
  });

  it('объём блока А по документу', () => {
    const vol = (id: string, level: number) => getExercise(id)!.levels[level - 1]!.volume;
    expect(vol('alertness-run', 3)).toMatchObject({ sets: 3, reps: 5 });
    expect(vol('skating-jumps', 1)).toMatchObject({ sets: 2, reps: 5, perSide: true });
    expect(vol('single-leg-stance', 4)).toMatchObject({ sets: 1, reps: 5, perSide: true });
    expect(vol('single-leg-stance', 5)).toMatchObject({ sets: 1, workSec: 20, perSide: true });
    expect(vol('press-up-plank', 4)).toMatchObject({ sets: 3, workSec: 15 });
    expect(vol('press-up-plank', 5)).toMatchObject({ sets: 3, workSec: 10 });
    expect(vol('spiderman', 2)).toMatchObject({ sets: 3, workSec: 15 });
    expect(vol('spiderman', 3)).toMatchObject({ sets: 3, reps: 1 });
    expect(vol('sideways-roll', 1)).toMatchObject({ reps: 5, perSide: true });
  });

  it('блоки Б–Г: количество упражнений', () => {
    expect(byPart('ball')).toHaveLength(8);
    expect(byPart('feet')).toHaveLength(5);
    expect(byPart('game')).toHaveLength(4);
    const cooldown = byPart('cooldown');
    expect(cooldown.filter((e) => e.category === 'games')).toHaveLength(3);
    expect(cooldown.filter((e) => e.category === 'mobility')).toHaveLength(6);
    expect(exercises).toHaveLength(33);
  });

  it('упражнения, открывающиеся позже: с 5-й недели — 5 штук, с 9-й — wall-pass (прогрессия из program.md)', () => {
    const week = (w: number) =>
      exercises
        .filter((e) => e.fromWeek === w)
        .map((e) => e.id)
        .sort();
    expect(week(5)).toEqual(['fake-burst', 'ladder-ball', 'roll-stop', 'snail', 'stop-turn']);
    expect(week(9)).toEqual(['wall-pass']);
    expect(exercises.filter((e) => e.fromWeek !== undefined)).toHaveLength(6);
  });

  it('диапазоны времени сохранены: Б 30–45 с, В 10–15 с, мобильность 20–30 с', () => {
    expect(getExercise('toe-taps')!.levels[0]!.volume).toMatchObject({ workSec: 30, workSecMax: 45 });
    expect(getExercise('ladder')!.levels[0]!.volume).toMatchObject({ workSec: 10, workSecMax: 15 });
    expect(getExercise('cat-cow')!.levels[0]!.volume).toMatchObject({ workSec: 20, workSecMax: 30 });
  });

  it('демо: видео для уровней 1–2 блока А, картинка для 3–5 и для блоков Б–Г', () => {
    for (const e of byPart('program')) {
      e.levels.forEach((l) =>
        expect(l.demo.kind, `${e.id} l${l.level}`).toBe(l.level <= 2 ? 'video' : 'image'),
      );
    }
    for (const e of exercises.filter((x) => !x.partKinds.includes('program'))) {
      expect(e.levels[0]!.demo.kind, e.id).toBe('image');
    }
  });

  it('шаблон занятия: 5 частей, ~35 мин', () => {
    expect(program.session.parts.map((p) => p.kind)).toEqual(['game', 'program', 'ball', 'feet', 'cooldown']);
    expect(program.session.parts.reduce((s, p) => s + p.minutes, 0)).toBe(35);
  });

  it('в текстах нет бренда FIFA', () => {
    expect(JSON.stringify(program)).not.toMatch(/fifa/i);
  });

  it('общие правила блоков взяты дословно из docs/program.md (методику не придумываем)', () => {
    const source = readFileSync('docs/program.md', 'utf8').replace(/\s+/g, ' ').toLowerCase();
    for (const list of Object.values(program.rules)) {
      for (const rule of list?.ru ?? []) {
        // первая буква в источнике может быть строчной («Общее: стоять…»), поэтому сравниваем без регистра
        expect(source, rule).toContain(rule.replace(/\s+/g, ' ').toLowerCase());
      }
    }
  });
});
