import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Button.module.scss';

type Common = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  iconRight?: ReactNode;
  children: ReactNode;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & {
    to?: undefined;
    loading?: boolean;
  };

type AsLink = Common & { to: string; onClick?: () => void; loading?: undefined; disabled?: undefined };

type Props = AsButton | AsLink;

/** Кнопка (или ссылка, если задан `to`). Акцент берётся из `--accent`, поэтому зависит от режима. */
export function Button(props: Props) {
  const { variant = 'primary', size = 'md', fullWidth = false, iconRight, children } = props;
  const className = [styles.button, styles[variant], styles[size], fullWidth && styles.full]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {props.loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
      {iconRight && !props.loading && (
        <span className={styles.icon} aria-hidden="true">
          {iconRight}
        </span>
      )}
    </>
  );

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={className} onClick={props.onClick}>
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    fullWidth: _f,
    iconRight: _i,
    children: _c,
    loading,
    disabled,
    type = 'button',
    ...rest
  } = props;
  return (
    <button
      {...rest}
      type={type}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
