import styles from './StatRow.module.scss';

type Item = { value: string; label: string };

type Props = {
  items: Item[];
  /** Мельче значения (экран упражнения: 15 px вместо 18). */
  compact?: boolean;
};

/** Ряд показателей «значение над подписью» с разделителями. */
export function StatRow({ items, compact = false }: Props) {
  return (
    <dl className={compact ? `${styles.row} ${styles.compact}` : styles.row}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
