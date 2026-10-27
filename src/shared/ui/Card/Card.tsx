import type { ReactNode } from 'react';
import styles from './Card.module.scss';

type Props = {
  as?: 'div' | 'section' | 'article';
  padding?: 'md' | 'lg';
  children?: ReactNode;
};

/** Карточка с полупрозрачной подложкой и размытием фона — читаема поверх любой картинки. */
export function Card({ as: Tag = 'div', padding = 'md', children }: Props) {
  return <Tag className={`${styles.card} ${styles[padding]}`}>{children}</Tag>;
}
