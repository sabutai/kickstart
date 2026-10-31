import back from '../../assets/kik/kik-back.png';
import front from '../../assets/kik/kik-front.png';
import head from '../../assets/kik/kik-head.png';
import side from '../../assets/kik/kik-side.png';
import three from '../../assets/kik/kik-three.png';

import type { KikPose } from './poses';

const IMAGES: Record<KikPose, string> = { front, three, side, back, head };

type Props = {
  pose?: KikPose;
  className?: string;
  /** Подпись для скринридера; по умолчанию Кик декоративен (смысл всегда дублируется текстом). */
  alt?: string;
};

/** Кик — маскот приложения (картинка из дизайна). Размер задаёт вызывающий через className. */
export function Mascot({ pose = 'front', className, alt = '' }: Props) {
  return (
    <img
      className={className}
      src={IMAGES[pose]}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      data-pose={pose}
      draggable={false}
    />
  );
}
