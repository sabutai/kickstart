import { Link } from 'react-router';
import styles from './Chip.module.scss';

type Props = {
  label: string;
  /** Цвет точки категории. */
  dotColor?: string;
  selected?: boolean;
  onClick?: () => void;
  to?: string;
};

/** Чип: ссылка (`to`), переключатель (`selected`/`onClick`) или статичная метка. */
export function Chip({ label, dotColor, selected = false, onClick, to }: Props) {
  const className = [styles.chip, selected && styles.selected].filter(Boolean).join(' ');
  const content = (
    <>
      {dotColor && <span className={styles.dot} style={{ background: dotColor }} aria-hidden="true" />}
      <span className={styles.label}>{label}</span>
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} className={`${className} ${styles.interactive}`}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={`${className} ${styles.interactive}`}
        aria-pressed={selected}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return <span className={className}>{content}</span>;
}
