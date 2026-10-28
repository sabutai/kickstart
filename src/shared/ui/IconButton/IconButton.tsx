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
  /** Видимый диаметр кружка; зона нажатия всё равно не меньше 44 px. */
  size?: number;
  /** `surface` — тёмный кружок, `glass` — полупрозрачный поверх картинки, `plain` — без фона. */
  variant?: 'surface' | 'glass' | 'plain';
};

/** Иконочная кнопка (или ссылка, если задан `to`) с зоной нажатия 44 px. */
export function IconButton({
  label,
  children,
  onClick,
  to,
  disabled = false,
  size = 44,
  variant = 'surface',
}: Props) {
  const disc = (
    <span className={`${styles.disc} ${styles[variant]}`} style={{ width: size, height: size }}>
      {children}
    </span>
  );
  if (to !== undefined) {
    return (
      <Link to={to} className={styles.button} aria-label={label}>
        {disc}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.button} aria-label={label} onClick={onClick} disabled={disabled}>
      {disc}
    </button>
  );
}
