import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { getExercise } from '../../content';
import { volumeLine } from '../../content/format';
import { clampLevel, maxHomeLevel } from '../../content/selectors';
import { $mode } from '../../entities/profile/model';
import { $exerciseLevels } from '../../entities/progress/model';
import { Button } from '../../shared/ui/Button/Button';
import { Chip } from '../../shared/ui/Chip/Chip';
import { DemoPlayer, DemoSoonNote } from '../../shared/ui/DemoPlayer/DemoPlayer';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { ExerciseDescription } from './ExerciseDescription';
import styles from './ExercisePage.module.scss';

const BACK_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      <main className={styles.empty}>
        <EmptyState
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
        <DemoPlayer
          key={`${exercise.id}-${level}`}
          demo={data.demo}
          title={exercise.title.ru}
          fallback={
            <>
              <Mascot pose="three" className={styles.kik} />
              <DemoSoonNote className={styles.note} />
            </>
          }
        />
      </div>
      <div className={styles.back}>
        <IconButton label={t('exercise.back')} onClick={goBack} size={42}>
          {BACK_ICON}
        </IconButton>
      </div>
      <span className={styles.category}>{t(`categories.${exercise.category}`)}</span>

      <section className={styles.sheet}>
        <div className={styles.scroll}>
          <header>
            <h1 className={styles.title}>{exercise.title.ru}</h1>
            <p className={styles.meta}>
              {multiLevel && `${t('exercise.levelNow', { level })} · `}
              {volumeLine(t, data.volume)}
            </p>
          </header>

          <ExerciseDescription exercise={exercise} level={data} />

          {isCoach && (multiLevel || exercise.mistakes) && (
            <section className={styles.coach} aria-label={t('exercise.forAdult')}>
              <p className={styles.coachTitle}>
                <b>{t('exercise.forAdult')}</b>
              </p>
              {multiLevel && (
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
              {exercise.mistakes && (
                <>
                  <p className={styles.coachLabel}>{t('exercise.mistakes')}</p>
                  <ul className={styles.mistakes}>
                    {exercise.mistakes.ru.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
        <div className={styles.cta}>
          <Button to="/timer" fullWidth size="lg">
            {t('exercise.start')}
          </Button>
        </div>
      </section>
    </main>
  );
}
