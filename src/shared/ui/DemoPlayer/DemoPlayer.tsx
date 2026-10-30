import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './DemoPlayer.module.scss';

type Demo = { kind: 'video' | 'image'; src: string; poster: string };

type Props = {
  demo: Demo;
  /** Название упражнения — для доступного имени области. */
  title: string;
  /** Что показать, пока нет медиа или оно не загрузилось (обычно Кик и пометка). */
  fallback: ReactNode;
  /** Каждое новое значение перезапускает демонстрацию (кнопка «повторить» снаружи). */
  replaySignal?: number;
  /** Нарисовать собственную кнопку «повторить» (если снаружи её нет). */
  showReplay?: boolean;
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** Пометка «демонстрация скоро появится» — для заглушки поверх фона. */
export function DemoSoonNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={className ? `${styles.note} ${className}` : styles.note}>{t('exercise.demo.soon')}</span>
  );
}

/**
 * Демонстрация упражнения: зацикленное видео без звука либо картинка-превью, на весь родительский блок.
 * Нет файла или он не загрузился — показывается `fallback` (на сегодня основной путь: медиа ещё нет).
 */
export function DemoPlayer({ demo, title, fallback, replaySignal = 0, showReplay = false }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  // При «уменьшении движения» ничего не запускаем сами — только по кнопке.
  const [reducedMotion] = useState(prefersReducedMotion);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play()?.catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (replaySignal > 0) play();
  }, [replaySignal, play]);

  return (
    <div className={styles.root} role="group" aria-label={t('exercise.demo.label', { title })}>
      {failed ? (
        fallback
      ) : demo.kind === 'video' ? (
        <>
          <video
            ref={videoRef}
            className={styles.media}
            src={asset(demo.src)}
            poster={asset(demo.poster)}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            onError={() => setFailed(true)}
          />
          {(showReplay || reducedMotion) && (
            <button type="button" className={styles.replay} onClick={play}>
              {t(reducedMotion ? 'exercise.demo.play' : 'exercise.demo.replay')}
            </button>
          )}
        </>
      ) : (
        <img className={styles.media} src={asset(demo.src)} alt="" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
