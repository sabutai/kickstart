import type { ReactNode } from 'react';
import { Backdrop, type ScreenBackground } from './Backdrop';
import styles from './Screen.module.scss';

export type { ScreenBackground };

type Props = {
  title: string;
  background?: ScreenBackground;
  pitchLines?: boolean;
  /** Слот справа от заголовка (например, плашка серии). */
  header?: ReactNode;
  children?: ReactNode;
};

/** Базовая обёртка экрана: подложка, заголовок, прокручиваемый контент. */
export function Screen({ title, background, pitchLines, header, children }: Props) {
  return (
    <main className={styles.screen}>
      <Backdrop background={background} pitchLines={pitchLines} />
      <div className={styles.scroll}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {header}
        </header>
        {children}
      </div>
    </main>
  );
}
