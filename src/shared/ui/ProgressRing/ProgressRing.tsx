import type { ReactNode } from 'react';
import styles from './ProgressRing.module.scss';

type Props = {
  /** Доля 0–1; значения вне диапазона обрезаются. */
  value: number;
  /** Доступное имя для скринридера (например, «Цель недели»). */
  label: string;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
};

/** Круговой индикатор прогресса с содержимым в центре. */
export function ProgressRing({ value, label, size = 66, strokeWidth = 7, children }: Props) {
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  return (
    <div
      className={styles.root}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.track} cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        <circle
          className={styles.bar}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className={styles.content}>{children}</span>
    </div>
  );
}
