import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './IconButton.module.scss';

type Props = {
  /** Обязателен: у иконки нет текста. */
  label: string;
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
};

/** Иконочная кнопка (или ссылка, если задан `to`) с зоной нажатия 44 px. */
export function IconButton({ label, children, onClick, to, disabled = false }: Props) {
  if (to !== undefined) {
    return (
      <Link to={to} className={styles.button} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.button} aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
