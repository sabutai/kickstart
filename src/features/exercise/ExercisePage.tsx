import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { getExercise } from '../../content';
import { volumeStats } from '../../content/format';
import { clampLevel, maxHomeLevel } from '../../content/selectors';
import { $mode } from '../../entities/profile/model';
import { $exerciseLevels } from '../../entities/progress/model';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { Chip } from '../../shared/ui/Chip/Chip';
import { DemoPlayer } from '../../shared/ui/DemoPlayer/DemoPlayer';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { LevelPips } from '../../shared/ui/LevelPips/LevelPips';
import { StatRow } from '../../shared/ui/StatRow/StatRow';
import styles from './ExercisePage.module.scss';

const BACK_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 6L8 12L15 18"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function ExercisePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { exerciseId = '' } = useParams();
  const [mode, levelOf] = useUnit([$mode, $exerciseLevels]);
  const exercise = getExercise(exerciseId);
  // Взрослый может посмотреть любой уровень; null — «показывать текущий уровень ребёнка».
  const [viewLevel, setViewLevel] = useState<number | null>(null);

  if (!exercise) {
    return (
      <main className={styles.page}>
        <EmptyState
          mascot="thinking"
          title={t('exercise.notFoundTitle')}
          text={t('exercise.notFoundText')}
          action={<Button to="/library">{t('exercise.toLibrary')}</Button>}
        />
      </main>
    );
  }

  const isCoach = mode === 'coach';
  const homeMax = maxHomeLevel(exercise);
  // Ребёнку дома не показываем уровни выше безопасного (перекат — не выше 3), даже если прогресс выше.
  const childLevel = Math.min(clampLevel(exercise, levelOf(exercise.id)), homeMax);
  const level = isCoach && viewLevel !== null ? clampLevel(exercise, viewLevel) : childLevel;
  const data = exercise.levels[level - 1]!;
  const multiLevel = exercise.levels.length > 1;

  // Открыли по прямой ссылке (истории нет) — «Назад» ведёт в библиотеку.
  const goBack = () =>
    location.key !== 'default' ? void navigate(-1) : void navigate('/library', { replace: true });

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <DemoPlayer key={`${exercise.id}-${level}`} demo={data.demo} title={exercise.title.ru} />
        <div className={styles.heroTop}>
          <IconButton label={t('exercise.back')} onClick={goBack}>
            {BACK_ICON}
          </IconButton>
          <span className={styles.category}>
            <span
              className={styles.dot}
              style={{ background: `var(--cat-${exercise.category})` }}
              aria-hidden="true"
            />
            {t(`categories.${exercise.category}`)}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <header>
          <h1 className={styles.title}>{exercise.title.ru}</h1>
          {multiLevel && <LevelPips level={level} showLabel />}
        </header>

        {isCoach && multiLevel && (
          <div className={styles.levels} role="group" aria-label={t('exercise.levelsLabel')}>
            {exercise.levels.map((l) => (
              <Chip
                key={l.level}
                label={
                  l.level > homeMax
                    ? `${t('exercise.levelTab', { level: l.level })} · ${t('exercise.notAtHome')}`
                    : t('exercise.levelTab', { level: l.level })
                }
                selected={l.level === level}
                onClick={() => setViewLevel(l.level)}
              />
            ))}
          </div>
        )}

        <StatRow items={volumeStats(t, data.volume)} />

        {exercise.safety?.needsMat && (
          <p className={styles.safety} role="note">
            {t('exercise.safetyMat')}
          </p>
        )}

        {exercise.setup && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('exercise.setup')}</h2>
            <p className={styles.text}>{exercise.setup.ru}</p>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t(exercise.steps ? 'exercise.levelVariation' : 'exercise.steps')}
          </h2>
          <p className={styles.text}>{data.variation.ru}</p>
        </section>

        {exercise.steps && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('exercise.steps')}</h2>
            <ol className={styles.steps}>
              {exercise.steps.ru.map((step, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={styles.text}>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {exercise.cue && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('exercise.cue')}</h2>
            <p className={styles.cue}>«{exercise.cue.ru}»</p>
          </section>
        )}

        {exercise.why && (
          <Card as="section" padding="md" label={t('exercise.why')}>
            <h2 className={styles.sectionTitle}>{t('exercise.why')}</h2>
            <p className={styles.text}>{exercise.why.ru}</p>
          </Card>
        )}

        {isCoach && exercise.mistakes && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('exercise.mistakes')}</h2>
            <ul className={styles.mistakes}>
              {exercise.mistakes.ru.map((m) => (
                <li key={m} className={styles.text}>
                  {m}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isCoach && exercise.lookFor && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('exercise.lookFor')}</h2>
            <p className={styles.text}>{exercise.lookFor.ru}</p>
          </section>
        )}

        <div className={styles.cta}>
          <Button to="/timer" fullWidth size="lg">
            {t('exercise.start')}
          </Button>
        </div>
      </div>
    </main>
  );
}
