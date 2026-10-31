import { describe, expect, it } from 'vitest';
import { categoryLevels } from './levels';

describe('categoryLevels', () => {
  it('показывает только категории блока А: разминка, баланс, сила — в порядке программы', () => {
    expect(categoryLevels(() => 1).map((c) => c.category)).toEqual(['warmup', 'balance', 'strength']);
  });

  it('на старте везде первый уровень', () => {
    expect(categoryLevels(() => 1).map((c) => c.level)).toEqual([1, 1, 1]);
  });

  it('уровень категории — среднее по её упражнениям, округлённое', () => {
    // баланс: skating-jumps и single-leg-stance
    const levels: Record<string, number> = { 'skating-jumps': 3, 'single-leg-stance': 2 };
    const balance = categoryLevels((id) => levels[id] ?? 1).find((c) => c.category === 'balance')!;
    expect(balance.level).toBe(3); // 2,5 → 3
  });

  it('значения вне диапазона не ломают расчёт', () => {
    for (const c of categoryLevels(() => 99)) expect(c.level).toBe(5);
    for (const c of categoryLevels(() => 0)) expect(c.level).toBe(1);
  });
});
