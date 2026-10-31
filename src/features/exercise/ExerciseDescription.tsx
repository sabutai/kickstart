import { useTranslation } from 'react-i18next';
import type { Exercise, ExerciseLevel } from '../../content/schema';
import { rulesFor, stepsFor } from '../../content/selectors';
import styles from './ExerciseDescription.module.scss';

type Props = {
  exercise: Exercise;
  /** Данные показанного уровня (описание уровня берётся из них). */
  level: ExerciseLevel;
};

function Steps({ items }: { items: string[] }) {
  return (
    <ol className={styles.steps}>
      {items.map((step, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.stepNumber} aria-hidden="true">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Всё, что ребёнку нужно знать об упражнении: исходное положение, шаги, команда, на что смотреть,
 * предупреждение про матрас, общие правила блока и «Зачем». Один и тот же текст на экране упражнения
 * и перед стартом в таймере. Ошибки остаются только взрослому (блок «Для взрослого»).
 */
export function ExerciseDescription({ exercise, level }: Props) {
  const { t } = useTranslation();
  const variation = level.variation.ru;
  // У блока А шаги заданы в данных, а описание уровня — отдельный абзац; у остальных «Как делать»
  // одним абзацем делится на шаги, и повторять его ещё и текстом не нужно.
  const derived = exercise.steps ? null : stepsFor(exercise, variation);
  const rules = rulesFor(exercise);

  return (
    <div className={styles.root}>
      {exercise.setup && <p className={styles.text}>{exercise.setup.ru}</p>}
      {derived ? <Steps items={derived} /> : <p className={styles.text}>{variation}</p>}
      {exercise.steps && <Steps items={exercise.steps.ru} />}

      {exercise.cue && (
        <p className={styles.cue}>
          <b>{t('exercise.cue')}: </b>«{exercise.cue.ru}»
        </p>
      )}

      {exercise.lookFor && (
        <p className={styles.look}>
          <b>{t('exercise.lookFor')}: </b>
          {exercise.lookFor.ru}
        </p>
      )}

      {exercise.safety?.needsMat && (
        <p className={styles.note} role="note">
          {t('exercise.safetyMat')}
        </p>
      )}

      {rules.length > 0 && (
        <section className={styles.rules} aria-label={t('exercise.common')}>
          <p className={styles.rulesTitle}>
            <b>{t('exercise.common')}</b>
          </p>
          <ul className={styles.rulesList}>
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
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
