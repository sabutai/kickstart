import { describe, expect, it } from 'vitest';
import i18n from '../app/i18n';
import { getExercise } from './index';
import { cardDetail, formatDuration, volumeLine } from './format';

const t = i18n.t.bind(i18n);
const level = (id: string, n: number) => getExercise(id)!.levels[n - 1]!;

describe('formatDuration', () => {
  it('секунды: одиночное значение и диапазон', () => {
    expect(formatDuration(t, 15)).toBe('15 сек');
    expect(formatDuration(t, 30, 45)).toBe('30–45 сек');
    expect(formatDuration(t, 20, 20)).toBe('20 сек');
  });

  it('целые минуты показываются минутами', () => {
    expect(formatDuration(t, 180, 240)).toBe('3–4 мин');
    expect(formatDuration(t, 120)).toBe('2 мин');
  });

  it('смешанное (не кратно минуте) остаётся в секундах', () => {
    expect(formatDuration(t, 90)).toBe('90 сек');
    expect(formatDuration(t, 60, 90)).toBe('60–90 сек');
  });
});

describe('volumeLine', () => {
  it('повторы на сторону и отдых', () => {
    expect(volumeLine(t, level('skating-jumps', 1).volume)).toBe(
      '2 подхода по 5 повторов на сторону · отдых 30 сек',
    );
  });

  it('повторы без сторон', () => {
    expect(volumeLine(t, level('alertness-run', 1).volume)).toBe('3 подхода по 5 повторов · отдых 30 сек');
  });

  it('на время; склонение «подход» и «повтор»', () => {
    expect(volumeLine(t, level('press-up-plank', 1).volume)).toBe('3 подхода по 15 сек · отдых 30 сек');
    expect(volumeLine(t, level('single-leg-stance', 5).volume)).toBe(
      '1 подход по 20 сек на сторону · отдых 30 сек',
    );
    expect(volumeLine(t, level('spiderman', 3).volume)).toBe('3 подхода по 1 повтор · отдых 30 сек');
  });

  it('нулевого отдыха в строке нет; диапазон времени сохраняется', () => {
    expect(volumeLine(t, level('deep-squat', 1).volume)).toBe('1 подход по 20–30 сек');
    expect(volumeLine(t, level('toe-taps', 1).volume)).toBe('2 подхода по 30–45 сек · отдых 20 сек');
  });
});

describe('cardDetail', () => {
  it('многоуровневое: число подходов', () => {
    expect(cardDetail(t, getExercise('skating-jumps')!, 2)).toBe('2 подхода');
    expect(cardDetail(t, getExercise('single-leg-stance')!, 1)).toBe('1 подход');
  });

  it('одноуровневое: время работы; игры — в минутах', () => {
    expect(cardDetail(t, getExercise('toe-taps')!, 1)).toBe('30–45 сек');
    expect(cardDetail(t, getExercise('traffic-light')!, 1)).toBe('3–4 мин');
  });

  it('упражнения, открывающиеся позже, получают пометку', () => {
    expect(cardDetail(t, getExercise('snail')!, 1)).toBe('30–45 сек · с 5-й недели');
    expect(cardDetail(t, getExercise('wall-pass')!, 1)).toBe('30–45 сек · с 9-й недели');
  });

  it('уровень вне диапазона не ломает значок', () => {
    expect(cardDetail(t, getExercise('skating-jumps')!, 9)).toBe('2 подхода');
  });
});
