import styles from './Mascot.module.scss';

export type MascotEmotion = 'joy' | 'rest' | 'thinking';

type Props = {
  emotion?: MascotEmotion;
  size?: number;
};

/** Голова Кика в трёх эмоциях. Декоративная: смысл всегда дублируется текстом рядом. */
export function Mascot({ emotion = 'joy', size = 120 }: Props) {
  return (
    <svg
      className={styles.mascot}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      data-emotion={emotion}
    >
      <circle className={styles.head} cx="60" cy="62" r="44" strokeWidth="5" />
      <path className={styles.cap} d="M18 48 Q60 26 102 48 L104 62 Q60 42 16 62 Z" strokeWidth="4" strokeLinejoin="round" />
      {emotion === 'joy' && (
        <>
          <path className={styles.line} d="M38 72 Q46 62 54 72" strokeWidth="4.5" />
          <path className={styles.line} d="M66 72 Q74 62 82 72" strokeWidth="4.5" />
          <path className={styles.mouthFill} d="M44 84 Q60 104 76 84 Z" strokeWidth="3" strokeLinejoin="round" />
        </>
      )}
      {emotion === 'rest' && (
        <>
          <path className={styles.line} d="M38 72 Q46 79 54 72" strokeWidth="4.5" />
          <path className={styles.line} d="M66 72 Q74 79 82 72" strokeWidth="4.5" />
          <path className={styles.line} d="M52 88 Q60 94 68 88" strokeWidth="4" />
        </>
      )}
      {emotion === 'thinking' && (
        <>
          <ellipse className={styles.eye} cx="46" cy="74" rx="5" ry="7" />
          <ellipse className={styles.eye} cx="74" cy="74" rx="5" ry="7" />
          <path className={styles.line} d="M36 66 L54 63 M66 63 L84 66" strokeWidth="3.5" />
          <path className={styles.line} d="M52 90 L68 88" strokeWidth="4" />
        </>
      )}
    </svg>
  );
}
