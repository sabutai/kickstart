import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LevelPips } from '../LevelPips/LevelPips';
import styles from './ExerciseCard.module.scss';

type Props = {
  title: string;
  description: string;
  /** Уровень для пипсов; нет — пипсы не показываем (у упражнения один уровень). */
  level?: number;
  /** Подпись под названием: «Ур. 2 · 2 подхода» — собирает вызывающий. */
  meta: string;
  /** Цвет категории: полоска слева. */
  categoryColor: string;
  to: string;
  /** Превью упражнения; пока нет медиа — заглушка. */
  thumb?: ReactNode;
};

/** Карточка упражнения в списке библиотеки; вся карточка — ссылка. */
export function ExerciseCard({ title, description, level, meta, categoryColor, to, thumb }: Props) {
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
          {level !== undefined && <LevelPips level={level} />}
          <span className={styles.metaText}>{meta}</span>
        </span>
      </span>
    </Link>
  );
}
