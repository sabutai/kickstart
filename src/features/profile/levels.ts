import { exercises } from '../../content';
import { CATEGORY_ORDER } from '../../content/selectors';
import type { Category, Exercise } from '../../content/schema';

export type CategoryLevel = { category: Category; level: number };

/**
 * Уровень по категориям для профиля: среднее по её упражнениям с несколькими уровнями (блок А),
 * округлённое до целого. Категории без таких упражнений (техника, игры, мобильность) не показываем:
 * у них один уровень, повышать нечего.
 */
export function categoryLevels(
  levelOf: (exerciseId: string) => number,
  all: readonly Exercise[] = exercises,
): CategoryLevel[] {
  return CATEGORY_ORDER.flatMap((category) => {
    const leveled = all.filter((e) => e.category === category && e.levels.length > 1);
    if (leveled.length === 0) return [];
    const mean =
      leveled.reduce((sum, e) => sum + Math.min(Math.max(levelOf(e.id), 1), e.levels.length), 0) /
      leveled.length;
    return [{ category, level: Math.round(mean) }];
  });
}
