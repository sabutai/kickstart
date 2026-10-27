import styles from './Stepper.module.scss';

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Как показать значение («8 лет»); по умолчанию просто число. */
  format?: (value: number) => string;
  label?: string;
};

/** Счётчик с кнопками «−» и «+»; на границах кнопка блокируется, значение не выходит за min/max. */
export function Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel, format, label }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <output className={styles.value} aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
