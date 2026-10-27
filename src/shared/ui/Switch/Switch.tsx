import { useId } from 'react';
import styles from './Switch.module.scss';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Пояснение под подписью. */
  description?: string;
};

/** Переключатель «вкл/выкл» с подписью; вся строка нажимается. */
export function Switch({ checked, onChange, label, description }: Props) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-desc` : undefined}
      className={styles.row}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.text}>
        <span id={`${id}-label`} className={styles.label}>
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className={styles.desc}>
            {description}
          </span>
        )}
      </span>
      <span className={checked ? `${styles.track} ${styles.on}` : styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
