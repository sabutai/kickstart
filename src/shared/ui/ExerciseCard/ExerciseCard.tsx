import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LevelPips } from '../LevelPips/LevelPips';
import styles from './ExerciseCard.module.scss';

type Props = {
  title: string;
  description: string;
  level: number;
  durationMin: number;
  /** Цвет категории: полоска слева. */
  categoryColor: string;
  to: string;
  /** Превью упражнения; пока нет медиа — заглушка. */
  thumb?: ReactNode;
};

/** Карточка упражнения в списке библиотеки; вся карточка — ссылка. */
export function ExerciseCard({ title, description, level, durationMin, categoryColor, to, thumb }: Props) {
  const { t } = useTranslation();
  return (
    <Link to={to} className={styles.card}>
      <span className={styles.stripe} style={{ background: categoryColor }} aria-hidden="true" />
      <span className={styles.thumb} aria-hidden="true">
        {thumb}
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        <span className={styles.desc}>{description}</span>
        <span className={styles.meta}>
          <LevelPips level={level} />
          <span className={styles.metaText}>
            {t('ui.levelShort', { level })} · {t('ui.minutes', { count: durationMin })}
          </span>
        </span>
      </span>
    </Link>
  );
}
