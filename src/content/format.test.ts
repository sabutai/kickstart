import { describe, expect, it } from 'vitest';
import i18n from '../app/i18n';
import { getExercise } from './index';
import { cardMeta, formatDuration, volumeStats } from './format';

const t = i18n.t.bind(i18n);
const level = (id: string, n: number) => getExercise(id)!.levels[n - 1]!;

describe('formatDuration', () => {
  it('секунды: одиночное значение и диапазон', () => {
    expect(formatDuration(t, 15)).toBe('15 с');
    expect(formatDuration(t, 30, 45)).toBe('30–45 с');
    expect(formatDuration(t, 20, 20)).toBe('20 с');
  });

  it('целые минуты показываются минутами', () => {
    expect(formatDuration(t, 180, 240)).toBe('3–4 мин');
    expect(formatDuration(t, 120)).toBe('2 мин');
  });

  it('смешанное (не кратно минуте) остаётся в секундах', () => {
    expect(formatDuration(t, 90)).toBe('90 с');
    expect(formatDuration(t, 60, 90)).toBe('60–90 с');
  });
});

describe('volumeStats', () => {
  it('подходы, повторы на сторону и отдых', () => {
    expect(volumeStats(t, level('skating-jumps', 1).volume)).toEqual([
      { value: '2', label: 'подхода' },
      { value: '5 на сторону', label: 'повторы' },
      { value: '30 с', label: 'отдых' },
    ]);
  });

  it('повторы без сторон', () => {
    expect(volumeStats(t, level('alertness-run', 1).volume)).toEqual([
      { value: '3', label: 'подхода' },
      { value: '5', label: 'повторы' },
      { value: '30 с', label: 'отдых' },
    ]);
  });

  it('на время: работа вместо повторов; склонение «подход»', () => {
    expect(volumeStats(t, level('press-up-plank', 1).volume)).toEqual([
      { value: '3', label: 'подхода' },
      { value: '15 с', label: 'работа' },
      { value: '30 с', label: 'отдых' },
    ]);
    expect(volumeStats(t, level('single-leg-stance', 1).volume)[0]).toEqual({ value: '1', label: 'подход' });
    expect(volumeStats(t, level('toe-taps', 1).volume)[0]).toEqual({ value: '2', label: 'подхода' });
  });

  it('нулевого отдыха нет в списке', () => {
    const stats = volumeStats(t, level('deep-squat', 1).volume);
    expect(stats.map((s) => s.label)).toEqual(['подход', 'работа']);
  });
});

describe('cardMeta', () => {
  it('многоуровневое: уровень и подходы', () => {
    expect(cardMeta(t, getExercise('skating-jumps')!, 2)).toBe('Ур. 2 · 2 подхода');
  });

  it('одноуровневое: время работы; игры — в минутах', () => {
    expect(cardMeta(t, getExercise('toe-taps')!, 1)).toBe('30–45 с');
    expect(cardMeta(t, getExercise('traffic-light')!, 1)).toBe('3–4 мин');
  });

  it('упражнения с 5-й недели получают пометку', () => {
    expect(cardMeta(t, getExercise('snail')!, 1)).toBe('30–45 с · с 5-й недели');
  });

  it('уровень вне диапазона не ломает подпись', () => {
    expect(cardMeta(t, getExercise('skating-jumps')!, 9)).toBe('Ур. 5 · 2 подхода');
  });
});
