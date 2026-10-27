import styles from './StatRow.module.scss';

type Item = { value: string; label: string };

type Props = { items: Item[] };

/** Ряд показателей «значение над подписью» с разделителями. */
export function StatRow({ items }: Props) {
  return (
    <dl className={styles.row}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
