import type { ReactNode } from 'react';
import { Mascot, type MascotEmotion } from '../Mascot/Mascot';
import styles from './EmptyState.module.scss';

type Props = {
  mascot?: MascotEmotion;
  title: string;
  text?: string;
  /** Обычно `<Button>`. */
  action?: ReactNode;
};

/** Пустое состояние: Кик, заголовок, пояснение и необязательное действие. */
export function EmptyState({ mascot = 'thinking', title, text, action }: Props) {
  return (
    <section className={styles.root}>
      <Mascot emotion={mascot} />
      <h2 className={styles.title}>{title}</h2>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </section>
  );
}
