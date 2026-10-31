import { Link } from 'react-router';
import { Mascot } from '../Mascot/Mascot';
import { KIK_POSES } from '../Mascot/poses';
import styles from './ExerciseCard.module.scss';

type Props = {
  title: string;
  /** Категория со значком-точкой: «Баланс · 2 подхода». */
  category: string;
  /** Время или число подходов рядом с категорией. */
  detail: string;
  /** Цвет точки категории. */
  categoryColor: string;
  to: string;
  /** Порядковый номер в списке: от него зависят фон и поза Кика (карточки чередуются, как в макете). */
  index: number;
};

const VARIANTS = ['green', 'lilac', 'sand', 'sky'] as const;
// CSS-модули в проекте в camelCase (см. vite.config.ts), поэтому класс Кика — kikGreen, а не kik-green.
const KIK_CLASS = { green: 'kikGreen', lilac: 'kikLilac', sand: 'kikSand', sky: 'kikSky' } as const;

/** Карточка упражнения в списке (макет «Упражнения»): широкая плитка с Киком, значком и названием. Вся плитка — ссылка. */
export function ExerciseCard({ title, category, detail, categoryColor, to, index }: Props) {
  const variant = VARIANTS[index % VARIANTS.length]!;
  const pose = KIK_POSES[index % KIK_POSES.length]!;
  return (
    <Link
      to={to}
      className={`${styles.card} ${styles[variant]}`}
      aria-label={`${title}. ${category}, ${detail}`}
    >
      <Mascot pose={pose} className={`${styles.kik} ${styles[KIK_CLASS[variant]]}`} />
      <span className={styles.text}>
        <span className={styles.badge}>
          <span className={styles.dot} style={{ background: categoryColor }} aria-hidden="true" />
          {category} · {detail}
        </span>
        <span className={styles.title}>{title}</span>
      </span>
    </Link>
  );
}
