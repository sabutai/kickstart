import type { ReactNode } from 'react';
import styles from './Screen.module.scss';

type Props = {
  title: string;
  /** Слот справа от заголовка (на календаре — «Неделя 1 из 12»). */
  aside?: ReactNode;
  children?: ReactNode;
};

/** Обычный светлый экран: заголовок 30 px и прокручиваемое содержимое (макеты «Упражнения», «Календарь»). */
export function Screen({ title, aside, children }: Props) {
  return (
    <main className={styles.screen}>
      <div className={styles.scroll}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {aside}
        </header>
        {children}
      </div>
    </main>
  );
}
