import { Link } from 'react-router';
import { LevelPips } from '../LevelPips/LevelPips';
import { Mascot } from '../Mascot/Mascot';
import styles from './ExerciseCard.module.scss';

type Props = {
  title: string;
  description: string;
  /** Уровень для пипсов; нет — пипсы не показываем (у упражнения один уровень). */
  level?: number;
  /** Текст рядом с пипсами: «Ур. 2» или «с 5-й недели». */
  levelText?: string;
  /** Значок в углу превью: время или число подходов. */
  badge: string;
  /** Цвет категории: свечение превью и значок «играть». */
  categoryColor: string;
  to: string;
};

/**
 * Карточка упражнения в списке (макет Library): превью со свечением, значок и кнопка «играть»,
 * ниже название, описание и уровень. Вся карточка — ссылка. Пока нет видео, в превью Кик.
 */
export function ExerciseCard({ title, description, level, levelText, badge, categoryColor, to }: Props) {
  return (
    <Link to={to} className={styles.card} style={{ ['--cat' as string]: categoryColor }}>
      <span className={styles.preview} aria-hidden="true">
        <Mascot emotion="joy" size={70} />
        <span className={styles.badge}>{badge}</span>
        <span className={styles.play}>
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path d="M8 5V19L19 12Z" fill="currentColor" />
          </svg>
        </span>
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        <span className={styles.desc}>{description}</span>
        {(level !== undefined || levelText) && (
          <span className={styles.meta}>
            {level !== undefined && <LevelPips level={level} />}
            {levelText && <span className={styles.metaText}>{levelText}</span>}
          </span>
        )}
      </span>
    </Link>
  );
}
