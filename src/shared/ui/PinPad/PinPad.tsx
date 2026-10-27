import { useTranslation } from 'react-i18next';
import styles from './PinPad.module.scss';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'erase'] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
};

/** Цифровая клавиатура PIN с индикатором введённых цифр. Значение — только цифры, не длиннее `length`. */
export function PinPad({ value, onChange, length = 4, error = false }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.pad}>
      <div
        className={error ? `${styles.dots} ${styles.error}` : styles.dots}
        role="img"
        aria-label={t('ui.pin.entered', { count: value.length, total: length })}
      >
        {Array.from({ length }, (_, i) => (
          <span key={i} className={i < value.length ? `${styles.dot} ${styles.filled}` : styles.dot} />
        ))}
      </div>
      <div className={styles.keys}>
        {KEYS.map((key) => {
          if (key === '') return <span key="gap" />;
          if (key === 'erase') {
            return (
              <button
                key={key}
                type="button"
                className={styles.key}
                aria-label={t('ui.pin.erase')}
                disabled={value.length === 0}
                onClick={() => onChange(value.slice(0, -1))}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 6H20V18H9L3 12L9 6ZM12 9.5L16.5 14.5M16.5 9.5L12 14.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              className={styles.key}
              disabled={value.length >= length}
              onClick={() => onChange(value + key)}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
