import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { cardBadge, cardLevelText } from '../../content/format';
import { CATEGORY_ORDER, describeExercise, exercisesIn, isCategory } from '../../content/selectors';
import type { Category } from '../../content/schema';
import { $exerciseLevels } from '../../entities/progress/model';
import { Chip } from '../../shared/ui/Chip/Chip';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { ExerciseCard } from '../../shared/ui/ExerciseCard/ExerciseCard';
import { Screen } from '../../shared/ui/Screen/Screen';
import styles from './LibraryPage.module.scss';

const colorOf = (category: Category) => `var(--cat-${category})`;

export function LibraryPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const levelOf = useUnit($exerciseLevels);

  // Фильтр живёт в адресе: «Назад» его не теряет, главная ссылается на него чипами. Мусор в адресе = «Все».
  const raw = params.get('category');
  const category: Category | 'all' = isCategory(raw) ? raw : 'all';
  const list = exercisesIn(category);

  const select = (next: Category | 'all') =>
    setParams(next === 'all' ? {} : { category: next }, { replace: true });

  return (
    <Screen title={t('screens.library')} background="library" pitchLines>
      <div className={styles.chips} role="group" aria-label={t('library.filterLabel')}>
        <Chip label={t('categories.all')} selected={category === 'all'} onClick={() => select('all')} />
        {CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            label={t(`categories.${c}`)}
            dotColor={colorOf(c)}
            selected={category === c}
            onClick={() => select(c)}
          />
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState mascot="thinking" title={t('library.emptyTitle')} text={t('library.emptyText')} />
      ) : (
        <>
          <p className={styles.count} aria-live="polite">
            {t('library.count', { count: list.length })}
          </p>
          <ul className={styles.list}>
            {list.map((exercise) => {
              const level = levelOf(exercise.id);
              return (
                <li key={exercise.id}>
                  <ExerciseCard
                    title={exercise.title.ru}
                    description={describeExercise(exercise)}
                    level={exercise.levels.length > 1 ? Math.min(level, exercise.levels.length) : undefined}
                    levelText={cardLevelText(t, exercise, level)}
                    badge={cardBadge(t, exercise, level)}
                    categoryColor={colorOf(exercise.category)}
                    to={`/exercise/${exercise.id}`}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Screen>
  );
}
