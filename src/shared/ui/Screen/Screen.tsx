import type { ReactNode } from 'react';
import styles from './Screen.module.scss';

type Props = {
  title: string;
  children?: ReactNode;
};

/** Базовая обёртка экрана: фон, отступы, заголовок. Фон-картинка появится на этапе 1. */
export function Screen({ title, children }: Props) {
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </main>
  );
}
