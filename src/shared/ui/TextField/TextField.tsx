import { useId } from 'react';
import styles from './TextField.module.scss';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  autoFocus?: boolean;
};

/** Текстовое поле с подписью; ошибка связана с полем через aria-describedby. */
export function TextField({ label, value, onChange, placeholder, maxLength, error, autoFocus }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? `${styles.input} ${styles.invalid}` : styles.input}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
