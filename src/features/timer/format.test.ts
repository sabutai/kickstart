import { describe, expect, it } from 'vitest';
import { averageRating, formatClock } from './format';

describe('formatClock', () => {
  it('минуты и секунды с ведущим нулём у секунд', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9_000)).toBe('0:09');
    expect(formatClock(20_000)).toBe('0:20');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
  });

  it('округляет вверх: пока не истекло, не показываем 0:00', () => {
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(1_001)).toBe('0:02');
    expect(formatClock(59_001)).toBe('1:00');
  });

  it('отрицательное — нули', () => {
    expect(formatClock(-500)).toBe('0:00');
  });
});

describe('averageRating', () => {
  it('среднее с запятой, пропущенные оценки не считаются', () => {
    expect(averageRating([5, 4, null, 4])).toBe('4,3');
    expect(averageRating([5, 5])).toBe('5');
    expect(averageRating([3])).toBe('3');
  });

  it('оценок нет — null', () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([null, null])).toBeNull();
  });
});
