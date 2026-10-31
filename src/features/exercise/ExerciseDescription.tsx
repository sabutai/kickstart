import { useTranslation } from 'react-i18next';
import type { Exercise, ExerciseLevel } from '../../content/schema';
import styles from './ExerciseDescription.module.scss';

type Props = {
  exercise: Exercise;
  /** Данные показанного уровня (описание уровня берётся из них). */
  level: ExerciseLevel;
};

/**
 * Всё, что ребёнку нужно знать об упражнении: исходное положение, описание уровня, шаги,
 * предупреждение про матрас и «Зачем». Один и тот же текст на экране упражнения и перед стартом в таймере.
 */
export function ExerciseDescription({ exercise, level }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.root}>
      {exercise.setup && <p className={styles.text}>{exercise.setup.ru}</p>}
      <p className={styles.text}>{level.variation.ru}</p>

      {exercise.steps && (
        <ol className={styles.steps}>
          {exercise.steps.ru.map((step, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {exercise.safety?.needsMat && (
        <p className={styles.note} role="note">
          {t('exercise.safetyMat')}
        </p>
      )}

      {exercise.why && (
        <p className={styles.why}>
          <b>{t('exercise.why')} </b>
          {exercise.why.ru}
        </p>
      )}
    </div>
  );
}
