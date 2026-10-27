import { describe, expect, it } from 'vitest';
import { exercises, getExercise } from './index';
import {
  CATEGORY_ORDER,
  categoryCounts,
  clampLevel,
  describeExercise,
  exercisesIn,
  firstSentence,
  isCategory,
  maxHomeLevel,
} from './selectors';

describe('категории', () => {
  it('порядок: 6 категорий программы', () => {
    expect(CATEGORY_ORDER).toEqual(['warmup', 'balance', 'strength', 'technique', 'games', 'mobility']);
  });

  it('isCategory отсекает мусор из URL', () => {
    expect(isCategory('balance')).toBe(true);
    expect(isCategory('cardio')).toBe(false);
    expect(isCategory(null)).toBe(false);
    expect(isCategory('')).toBe(false);
  });

  it('счётчики по категориям складываются в общее число упражнений', () => {
    const counts = categoryCounts();
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(exercises.length);
    expect(counts).toMatchObject({
      warmup: 1,
      balance: 2,
      strength: 4,
      technique: 8,
      games: 12,
      mobility: 6,
    });
  });

  it('exercisesIn(all) — все, иначе только своей категории; порядок программы сохраняется', () => {
    expect(exercisesIn('all')).toHaveLength(exercises.length);
    const balance = exercisesIn('balance');
    expect(balance.map((e) => e.id)).toEqual(['skating-jumps', 'single-leg-stance']);
    expect(exercisesIn('strength').map((e) => e.id)).toEqual([
      'press-up-plank',
      'single-leg-hops',
      'spiderman',
      'sideways-roll',
    ]);
  });
});

describe('firstSentence', () => {
  it('первое предложение', () => {
    expect(firstSentence('Раз. Два. Три.')).toBe('Раз.');
    expect(firstSentence('Без точки в конце')).toBe('Без точки в конце');
    expect(firstSentence('  Пробелы по краям. Дальше  ')).toBe('Пробелы по краям.');
  });

  it('точки внутри чисел и сокращений не режут предложение', () => {
    expect(firstSentence('Расстояние 1,5 м. Дальше')).toBe('Расстояние 1,5 м.');
    expect(firstSentence('Версия 2.5 подходит. Дальше')).toBe('Версия 2.5 подходит.');
  });

  it('пустая строка', () => {
    expect(firstSentence('')).toBe('');
  });
});

describe('describeExercise', () => {
  it('блок А — «Зачем»', () => {
    expect(describeExercise(getExercise('skating-jumps')!)).toMatch(/голеностоп/);
  });

  it('блоки Б–Г без «Зачем» — первое предложение описания, не пусто', () => {
    for (const e of exercises.filter((x) => !x.why)) {
      const text = describeExercise(e);
      expect(text.length, e.id).toBeGreaterThan(5);
      expect(text, e.id).toBe(firstSentence(e.levels[0]!.variation.ru));
    }
  });
});

describe('clampLevel / maxHomeLevel', () => {
  const roll = getExercise('sideways-roll')!;
  const stance = getExercise('single-leg-stance')!;
  const toeTaps = getExercise('toe-taps')!;

  it('уровень в пределах упражнения', () => {
    expect(clampLevel(stance, 9)).toBe(5);
    expect(clampLevel(stance, 0)).toBe(1);
    expect(clampLevel(stance, 3)).toBe(3);
    expect(clampLevel(toeTaps, 4)).toBe(1); // у упражнений блока Б один уровень
  });

  it('дома: перекат не выше 3, остальные — без ограничений', () => {
    expect(maxHomeLevel(roll)).toBe(3);
    expect(maxHomeLevel(stance)).toBe(5);
    expect(maxHomeLevel(toeTaps)).toBe(1);
  });
});
