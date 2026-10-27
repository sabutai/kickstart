import { useTranslation } from 'react-i18next';
import styles from './StepProgress.module.scss';

type Props = { current: number; total: number };

/** Полоски прогресса шагов; пройденные и текущий закрашены. */
export function StepProgress({ current, total }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.root} role="img" aria-label={t('ui.step', { current, total })}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < current ? `${styles.bar} ${styles.on}` : styles.bar} />
      ))}
    </div>
  );
}
