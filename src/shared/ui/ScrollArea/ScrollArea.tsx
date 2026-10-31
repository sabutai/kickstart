import { useState, type ReactNode, type UIEvent } from 'react';
import styles from './ScrollArea.module.scss';

type Props = {
  /** Классы прокручиваемого блока: отступы, зазоры и т. п. */
  className?: string;
  children: ReactNode;
};

/** Насколько надо прокрутить, чтобы показать размытие у верхнего края (меньше — это дрожь пальца). */
const THRESHOLD_PX = 2;

/**
 * Прокручиваемый блок в белой панели: когда текст уходит под верхний край, верхняя кромка плавно
 * размывается и светлеет — видно, что выше есть ещё содержимое, и обрезанные строки не режут глаз.
 * Пока не прокрутили, ничего не меняется.
 */
export function ScrollArea({ className, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (event: UIEvent<HTMLDivElement>) =>
    setScrolled(event.currentTarget.scrollTop > THRESHOLD_PX);

  return (
    <div className={styles.root}>
      <div className={className ? `${styles.scroll} ${className}` : styles.scroll} onScroll={onScroll}>
        {children}
      </div>
      <div
        className={scrolled ? `${styles.fade} ${styles.visible}` : styles.fade}
        aria-hidden="true"
        data-scrolled={scrolled}
      />
    </div>
  );
}
