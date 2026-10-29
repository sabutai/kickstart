import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { volumeStats } from '../../content/format';
import { describeExercise } from '../../content/selectors';
import {
  currentItem,
  currentTurn,
  fractionElapsed,
  remainingMs,
  upNext,
  type PlayerState,
} from '../../entities/session/player';
import { $mode } from '../../entities/profile/model';
import { Button } from '../../shared/ui/Button/Button';
import { DemoPlayer } from '../../shared/ui/DemoPlayer/DemoPlayer';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { LevelPips } from '../../shared/ui/LevelPips/LevelPips';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { ProgressRing } from '../../shared/ui/ProgressRing/ProgressRing';
import { StatRow } from '../../shared/ui/StatRow/StatRow';
import { averageRating, formatClock } from './format';
import { playerEvent, sessionLeft } from './model';
import styles from './Timer.module.scss';

type ViewProps = { player: PlayerState; now: number };

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 6L16 12L9 18"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Название, уровень и демонстрация текущего упражнения. */
function ExerciseHeader({
  player,
  compact = false,
  replaySignal = 0,
}: {
  player: PlayerState;
  compact?: boolean;
  replaySignal?: number;
}) {
  const { t } = useTranslation();
  const item = currentItem(player);
  const level = item.exercise.levels[item.level - 1]!;
  return (
    <>
      <DemoPlayer
        key={`${item.exercise.id}-${item.level}`}
        demo={level.demo}
        title={item.exercise.title.ru}
        compact={compact}
        replaySignal={replaySignal}
        hideReplay={compact}
      />
      <header className={styles.exerciseHead}>
        <h1 className={styles.title}>{item.exercise.title.ru}</h1>
        {item.exercise.levels.length > 1 && <LevelPips level={item.level} showLabel />}
      </header>
      {!compact && <p className={styles.sectionTitle}>{t(`timer.parts.${item.partKind}`)}</p>}
    </>
  );
}

/** Вступление: упражнение, объём и «Начать» (блок А и игры — нужно приготовиться взрослому). */
export function ReadyView({ player }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  return (
    <>
      <ExerciseHeader player={player} />
      <StatRow items={volumeStats(t, item.volume)} />
      {item.exercise.setup && <p className={styles.text}>{item.exercise.setup.ru}</p>}
      {!item.exercise.setup && <p className={styles.text}>{describeExercise(item.exercise)}</p>}
      {item.exercise.safety?.needsMat && (
        <p className={styles.safety} role="note">
          {t('exercise.safetyMat')}
        </p>
      )}
      <Button size="lg" fullWidth iconRight={ARROW} onClick={() => send({ type: 'begin' })}>
        {t('timer.start')}
      </Button>
    </>
  );
}

/** «Приготовься»: обратный отсчёт, потом работа начнётся сама. */
export function PrepareView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  const remaining = remainingMs(player, now) ?? 0;
  return (
    <>
      <h1 className={styles.title}>{item.exercise.title.ru}</h1>
      <div className={styles.ringBox}>
        <ProgressRing
          value={1 - fractionElapsed(player, now)}
          label={t('timer.prepare.title')}
          size={228}
          strokeWidth={12}
        >
          <span className={styles.bigTime}>{Math.ceil(remaining / 1000)}</span>
        </ProgressRing>
      </div>
      <p className={styles.center}>{t('timer.prepare.title')}</p>
      <Button fullWidth onClick={() => send({ type: 'skip' })}>
        {t('timer.prepare.go')}
      </Button>
    </>
  );
}

function upNextText(player: PlayerState, t: ReturnType<typeof useTranslation>['t']): string {
  const next = upNext(player);
  switch (next.kind) {
    case 'rest':
      return next.seconds > 0 ? t('timer.upNext.rest', { seconds: next.seconds }) : t('timer.upNext.turn');
    case 'side':
      return t('timer.upNext.side');
    case 'rating':
      return t('timer.upNext.rating');
    case 'item':
      return t('timer.upNext.item', { title: next.item.exercise.title.ru });
    case 'end':
      return t('timer.upNext.end');
  }
}

/** Подход: на время — кольцо с обратным отсчётом, на повторы — число и «Готово». */
export function WorkView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const [send, mode] = useUnit([playerEvent, $mode]);
  const item = currentItem(player);
  const turn = currentTurn(player);
  const remaining = remainingMs(player, now);
  const timed = remaining !== null;
  const setsDone = player.results[player.itemIndex]!.setsDone;
  const [replaySignal, setReplaySignal] = useState(0);

  return (
    <>
      <ExerciseHeader player={player} compact replaySignal={replaySignal} />
      <div className={styles.setPips} aria-hidden="true">
        {Array.from({ length: turn.sets }, (_, i) => (
          <span
            key={i}
            className={
              i < setsDone
                ? `${styles.pip} ${styles.pipDone}`
                : i === turn.set
                  ? `${styles.pip} ${styles.pipNow}`
                  : styles.pip
            }
          />
        ))}
      </div>
      <p className={styles.center}>
        {t('timer.work.set', { n: turn.set + 1, total: turn.sets })}
        {turn.side !== null && ` · ${t(turn.side === 0 ? 'timer.side.first' : 'timer.side.second')}`}
      </p>

      {timed ? (
        <div className={styles.ringBox}>
          <ProgressRing
            value={1 - fractionElapsed(player, now)}
            label={t('timer.work.set', { n: turn.set + 1, total: turn.sets })}
            size={228}
            strokeWidth={12}
          >
            <span className={styles.bigTime} role="timer">
              {formatClock(remaining)}
            </span>
          </ProgressRing>
        </div>
      ) : (
        <div className={styles.repsBox}>
          <span className={styles.bigTime}>{item.volume.reps}</span>
          <span className={styles.repsLabel}>{t('timer.work.reps', { count: item.volume.reps })}</span>
          <span className={styles.hint}>{t('timer.work.repsHint')}</span>
        </div>
      )}

      <div className={styles.controls}>
        <IconButton label={t('exercise.demo.replay')} size={46} onClick={() => setReplaySignal((n) => n + 1)}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12A8 8 0 0 1 19 8.5M20 12A8 8 0 0 1 5 15.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M19 4V9H14M5 20V15H10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        {timed ? (
          <button
            type="button"
            className={styles.pauseButton}
            aria-label={t('timer.work.pause')}
            onClick={() => send({ type: 'pause' })}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <Button size="lg" onClick={() => send({ type: 'complete' })}>
            {t('timer.work.done')}
          </Button>
        )}
        <IconButton label={t('timer.work.skip')} size={46} onClick={() => send({ type: 'skip' })}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 5L16 12L6 19Z" fill="currentColor" />
            <rect x="17" y="5" width="2.6" height="14" fill="currentColor" />
          </svg>
        </IconButton>
      </div>

      <p className={styles.upNext}>
        <span className={styles.upNextLabel}>{t('timer.upNext.label')} </span>
        {upNextText(player, t)}
      </p>
      {mode === 'child' && <p className={styles.encourage}>⭐ {t('timer.work.encourage')}</p>}
    </>
  );
}

/** Отдых: обратный отсчёт и (если дальше новое упражнение) карточка следующего. */
export function RestView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const remaining = remainingMs(player, now) ?? 0;
  const rest = player.rest!;
  const turn = currentTurn(player);
  const next = rest.next === 'item' ? player.session.items[player.itemIndex + 1] : undefined;

  const caption =
    rest.kind === 'side'
      ? t('timer.rest.sideTitle')
      : rest.kind === 'sets'
        ? t('timer.rest.beforeSet', { n: turn.set + 1, total: turn.sets })
        : t('timer.rest.nextExercise');

  return (
    <>
      <h1 className={styles.restLabel}>
        {rest.kind === 'side' ? t('timer.rest.sideTitle') : t('timer.rest.title')}
      </h1>
      <div className={styles.ringBox}>
        <ProgressRing
          value={1 - fractionElapsed(player, now)}
          label={t('timer.rest.title')}
          size={236}
          strokeWidth={11}
        >
          <span className={`${styles.bigTime} ${styles.bigTimeRest}`} role="timer">
            {formatClock(remaining)}
          </span>
        </ProgressRing>
      </div>
      {!next && <p className={styles.center}>{caption}</p>}

      {next && (
        <section className={styles.nextCard} aria-label={t('timer.rest.nextExercise')}>
          <span
            className={styles.nextThumb}
            aria-hidden="true"
            style={{ ['--cat' as string]: `var(--cat-${next.exercise.category})` }}
          >
            <Mascot emotion="joy" size={44} />
          </span>
          <div className={styles.nextBody}>
            <span className={styles.sectionTitle}>{t('timer.rest.nextExercise')}</span>
            <span className={styles.nextTitle}>{next.exercise.title.ru}</span>
            {next.exercise.levels.length > 1 && <LevelPips level={next.level} showLabel />}
          </div>
        </section>
      )}

      <Button fullWidth iconRight={ARROW} onClick={() => send({ type: 'skip' })}>
        {t('timer.rest.skip')}
      </Button>
    </>
  );
}

/** Оценка техники после упражнения блока А: одно нажатие — и дальше; можно пропустить. */
export function RatingView({ player }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  return (
    <>
      <div className={styles.centerBlock}>
        <Mascot emotion="joy" size={110} />
        <h1 className={styles.title}>{t('timer.rating.title')}</h1>
        <p className={styles.text}>{item.exercise.title.ru}</p>
        <p className={styles.hint}>{t('timer.rating.hint')}</p>
      </div>
      <div className={styles.stars} role="group" aria-label={t('timer.rating.title')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={styles.star}
            aria-label={t('timer.rating.star', { n })}
            onClick={() => send({ type: 'rate', rating: n })}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3L15 9L21 10L16.5 14.5L17.7 21L12 17.8L6.3 21L7.5 14.5L3 10L9 9Z"
                fill="currentColor"
              />
            </svg>
            <span className={styles.starNumber} aria-hidden="true">
              {n}
            </span>
          </button>
        ))}
      </div>
      <Button variant="ghost" fullWidth onClick={() => send({ type: 'rate', rating: null })}>
        {t('timer.rating.skip')}
      </Button>
    </>
  );
}

/** Итоги занятия с радостным Киком. */
export function DoneView({ player }: ViewProps) {
  const { t } = useTranslation();
  const leave = useUnit(sessionLeft);
  const minutes = Math.max(
    1,
    Math.round(((player.finishedAt ?? player.startedAt) - player.startedAt) / 60_000),
  );
  const exercises = player.results.filter((r) => r.setsDone > 0).length;
  const rating = averageRating(player.results.map((r) => r.rating));
  return (
    <>
      <div className={styles.centerBlock}>
        <Mascot emotion="joy" size={140} />
        <h1 className={styles.title}>{t('timer.done.title')}</h1>
      </div>
      <StatRow
        items={[
          { label: t('timer.done.time'), value: t('timer.done.minutes', { count: minutes }) },
          { label: t('timer.done.exercises'), value: String(exercises) },
          { label: t('timer.done.rating'), value: rating ?? t('timer.done.none') },
        ]}
      />
      <Button to="/" size="lg" fullWidth onClick={() => leave()}>
        {t('timer.done.home')}
      </Button>
    </>
  );
}
