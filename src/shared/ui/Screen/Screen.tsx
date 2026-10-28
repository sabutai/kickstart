import type { ReactNode } from 'react';
import { Backdrop, type ScreenBackground } from './Backdrop';
import styles from './Screen.module.scss';

export type { ScreenBackground };

type Props = {
  title: string;
  background?: ScreenBackground;
  pitchLines?: boolean;
  /** Слот справа от заголовка. */
  header?: ReactNode;
  /** Строка над заголовком (на главной — логотип и серия). */
  eyebrow?: ReactNode;
  /** `lg` — крупный заголовок 30 px (приветствие на главной). */
  titleSize?: 'md' | 'lg';
  children?: ReactNode;
};

/** Базовая обёртка экрана: подложка, заголовок, прокручиваемый контент. */
export function Screen({
  title,
  background,
  pitchLines,
  header,
  eyebrow,
  titleSize = 'md',
  children,
}: Props) {
  return (
    <main className={styles.screen}>
      <Backdrop background={background} pitchLines={pitchLines} />
      <div className={styles.scroll}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <header className={styles.header}>
          <h1 className={titleSize === 'lg' ? `${styles.title} ${styles.titleLg}` : styles.title}>{title}</h1>
          {header}
        </header>
        {children}
      </div>
    </main>
  );
}
