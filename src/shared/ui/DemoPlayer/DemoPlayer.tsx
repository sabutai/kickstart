import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../Mascot/Mascot';
import styles from './DemoPlayer.module.scss';

type Demo = { kind: 'video' | 'image'; src: string; poster: string };

type Props = {
  demo: Demo;
  /** Название упражнения — для доступного имени области. */
  title: string;
  /** Низкий вариант для экрана работы: оставляет место кольцу и кнопкам. */
  compact?: boolean;
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * Демонстрация упражнения: зацикленное видео без звука либо картинка-превью.
 * Нет файла или он не загрузился — заглушка с Киком (на сегодня основной путь: медиа ещё нет).
 */
export function DemoPlayer({ demo, title, compact = false }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  // При «уменьшении движения» ничего не запускаем сами — только по кнопке.
  const [reducedMotion] = useState(prefersReducedMotion);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play()?.catch(() => setFailed(true));
  };

  return (
    <div
      className={compact ? `${styles.root} ${styles.compact}` : styles.root}
      role="group"
      aria-label={t('exercise.demo.label', { title })}
    >
      {failed ? (
        <div className={styles.placeholder}>
          <Mascot emotion="thinking" size={compact ? 64 : 96} />
          <p className={styles.soon}>{t('exercise.demo.soon')}</p>
        </div>
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
          <button type="button" className={styles.replay} onClick={play}>
            {t(reducedMotion ? 'exercise.demo.play' : 'exercise.demo.replay')}
          </button>
        </>
      ) : (
        <img className={styles.media} src={asset(demo.src)} alt="" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
