import styles from './Stepper.module.scss';

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Мелкая единица рядом с числом («лет»). */
  unit?: string;
  label?: string;
};

/** Счётчик с кнопками «−» и «+»; на границах кнопка блокируется, значение не выходит за min/max. */
export function Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel, unit, label }: Props) {
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
        <span className={styles.disc} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <output className={styles.value} aria-live="polite">
        <span className={styles.number}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </output>
      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <span className={styles.disc} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
