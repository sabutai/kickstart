import { useState } from 'react';
import styles from './Screen.module.scss';

export type ScreenBackground =
  'home' | 'library' | 'calendar' | 'profile' | 'timer' | 'exercise' | 'onboarding';

type Props = {
  /** Файл `public/backgrounds/bg_{background}.webp`; нет файла — полосатый фолбэк. */
  background?: ScreenBackground;
  /** Линии футбольного поля сверху (как на макетах). */
  pitchLines?: boolean;
};

/** Подложка экрана: картинка, линии поля и градиенты сверху и снизу. Декоративна. */
export function Backdrop({ background, pitchLines = false }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = background !== undefined && !imageFailed;
  return (
    <>
      {showImage && (
        <img
          className={styles.image}
          src={`${import.meta.env.BASE_URL}backgrounds/bg_${background}.webp`}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
        />
      )}
      {pitchLines && (
        <svg className={styles.pitch} width="390" height="320" viewBox="0 0 390 320" aria-hidden="true">
          <circle cx="195" cy="30" r="90" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="0" y1="30" x2="390" y2="30" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      <div className={`${styles.shade} ${styles.shadeTop}`} aria-hidden="true" />
      <div className={`${styles.shade} ${styles.shadeBottom}`} aria-hidden="true" />
    </>
  );
}
