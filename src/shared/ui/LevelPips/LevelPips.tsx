import { useTranslation } from 'react-i18next';
import styles from './LevelPips.module.scss';

type Props = {
  level: number;
  max?: number;
  /** Показать подпись «Уровень N из M» рядом с пипсами. */
  showLabel?: boolean;
};

/** Пять (или `max`) полосок уровня; заполнены первые `level`. */
export function LevelPips({ level, max = 5, showLabel = false }: Props) {
  const { t } = useTranslation();
  const filled = Math.min(Math.max(Math.round(level), 0), max);
  const text = t('ui.level', { level: filled, max });
  return (
    <div className={styles.root} role="img" aria-label={text}>
      <span className={styles.pips} aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < filled ? `${styles.pip} ${styles.on}` : styles.pip} />
        ))}
      </span>
      {showLabel && (
        <span className={styles.label} aria-hidden="true">
          {text}
        </span>
      )}
    </div>
  );
}
