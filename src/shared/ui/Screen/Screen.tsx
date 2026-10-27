import { useState, type ReactNode } from 'react';
import styles from './Screen.module.scss';

export type ScreenBackground = 'home' | 'library' | 'calendar' | 'profile' | 'timer' | 'exercise' | 'onboarding';

type Props = {
  title: string;
  /** Имя фона: файл `public/backgrounds/bg_{background}.webp`. Нет файла — полосатый фолбэк. */
  background?: ScreenBackground;
  /** Слот справа от заголовка (например, плашка серии). */
  header?: ReactNode;
  children?: ReactNode;
};

/** Базовая обёртка экрана: фон-картинка, градиенты сверху и снизу, заголовок, прокручиваемый контент. */
export function Screen({ title, background, header, children }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = background !== undefined && !imageFailed;

  return (
    <main className={styles.screen}>
      {showImage && (
        <img
          className={styles.image}
          src={`${import.meta.env.BASE_URL}backgrounds/bg_${background}.webp`}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className={`${styles.shade} ${styles.shadeTop}`} aria-hidden="true" />
      <div className={`${styles.shade} ${styles.shadeBottom}`} aria-hidden="true" />
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
