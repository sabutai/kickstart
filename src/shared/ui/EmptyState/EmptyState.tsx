import type { ReactNode } from 'react';
import { Mascot } from '../Mascot/Mascot';
import type { KikPose } from '../Mascot/poses';
import styles from './EmptyState.module.scss';

type Props = {
  pose?: KikPose;
  title: string;
  text?: string;
  /** Обычно `<Button>`. */
  action?: ReactNode;
};

/** Пустое состояние: Кик, заголовок, пояснение и необязательное действие. */
export function EmptyState({ pose = 'head', title, text, action }: Props) {
  return (
    <section className={styles.root}>
      <Mascot pose={pose} className={pose === 'head' ? styles.head : styles.body} />
      <h2 className={styles.title}>{title}</h2>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </section>
  );
}
