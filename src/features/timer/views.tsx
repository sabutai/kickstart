import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { volumeLine } from '../../content/format';
import {
  currentItem,
  currentTurn,
  fractionElapsed,
  remainingMs,
  upNext,
  type PlayerState,
} from '../../entities/session/player';
import { $mode, $profile } from '../../entities/profile/model';
import { streak as streakOf } from '../../entities/schedule/home';
import { $plannedSessions } from '../../entities/schedule/model';
import { useToday } from '../../shared/lib/useToday';
import { Button } from '../../shared/ui/Button/Button';
import { ExerciseDescription } from '../exercise/ExerciseDescription';
import { DemoPlayer, DemoSoonNote } from '../../shared/ui/DemoPlayer/DemoPlayer';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { averageRating, formatClock } from './format';
import { endDialogOpened, playerEvent, sessionLeft } from './model';
import styles from './Timer.module.scss';

type ViewProps = { player: PlayerState; now: number };

const STAR_PATH = 'M12 3L15 9L21 10L16.5 14.5L17.7 21L12 17.8L6.3 21L7.5 14.5L3 10L9 9Z';

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={STAR_PATH}
        className={filled ? styles.starFilled : styles.starEmpty}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Кнопка «завершить тренировку» (крестик): открывает диалог, время на это время стоит. */
function CloseButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const open = useUnit(endDialogOpened);
  return (
    <div className={className}>
      <IconButton label={t('timer.close')} size={40} onClick={() => open()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </IconButton>
    </div>
  );
}

/** Крупный экран с Киком на градиенте: «Приготовься» и отдых (макет «Отдых»). */
function BigCountdown({
  label,
  value,
  caption,
  action,
  pose,
  children,
}: {
  label: string;
  value: string;
  caption?: string;
  action: ReactNode;
  pose: 'side' | 'three';
  children?: ReactNode;
}) {
  return (
    <div className={styles.restScreen}>
      <Mascot pose={pose} className={styles.restKik} />
      <CloseButton className={styles.closeTopRight} />
      <div className={styles.restText}>
        <h1 className={styles.restLabel}>{label}</h1>
        <div className={styles.restNumber} role="timer">
          {value}
        </div>
        {caption && <p className={styles.restCaption}>{caption}</p>}
        {children}
      </div>
      <div className={styles.restAction}>{action}</div>
    </div>
  );
}

/** Вступление: Кик, название, объём и «Начать» (блок А и игры — нужно приготовиться взрослому). */
export function ReadyView({ player }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  const level = item.exercise.levels[item.level - 1]!;
  return (
    <div className={styles.readyScreen}>
      <div className={styles.readyHero}>
        <DemoPlayer
          key={`${item.exercise.id}-${item.level}`}
          demo={level.demo}
          title={item.exercise.title.ru}
          fallback={
            <>
              <Mascot pose="three" className={styles.readyKik} />
              <DemoSoonNote className={styles.readyNote} />
            </>
          }
        />
      </div>
      <CloseButton className={styles.closeTopLeft} />
      <section className={styles.readySheet}>
        <div className={styles.readyScroll}>
          <div>
            <p className={styles.sheetLabel}>{t(`timer.parts.${item.partKind}`)}</p>
            <h1 className={styles.sheetTitle}>{item.exercise.title.ru}</h1>
            <p className={styles.sheetMeta}>
              {item.exercise.levels.length > 1 && `${t('exercise.levelNow', { level: item.level })} · `}
              {volumeLine(t, item.volume)}
            </p>
          </div>
          <ExerciseDescription exercise={item.exercise} level={level} />
        </div>
        <div className={styles.readyCta}>
          <Button size="lg" fullWidth onClick={() => send({ type: 'begin' })}>
            {t('timer.start')}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** «Приготовься»: обратный отсчёт, потом работа начнётся сама. */
export function PrepareView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  const seconds = Math.ceil((remainingMs(player, now) ?? 0) / 1000);
  return (
    <BigCountdown
      pose="three"
      label={t('timer.prepare.title')}
      value={String(seconds)}
      caption={item.exercise.title.ru}
      action={
        <Button size="lg" onClick={() => send({ type: 'skip' })}>
          {t('timer.prepare.go')}
        </Button>
      }
    />
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

/** Подход (макет «Таймер»): Кик на весь экран, три плашки сверху, ряд кнопок снизу. */
export function WorkView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const [send, mode] = useUnit([playerEvent, $mode]);
  const item = currentItem(player);
  const level = item.exercise.levels[item.level - 1]!;
  const turn = currentTurn(player);
  const remaining = remainingMs(player, now);
  const timed = remaining !== null;
  // Длинные игры (минуты) показываем минутами: «180 сек» ребёнку ничего не говорит.
  const inMinutes = timed && remaining >= 100_000;
  const setsDone = player.results[player.itemIndex]!.setsDone;
  const [replaySignal, setReplaySignal] = useState(0);

  return (
    <div className={styles.workScreen}>
      <div className={styles.workMedia}>
        <DemoPlayer
          key={`${item.exercise.id}-${item.level}`}
          demo={level.demo}
          title={item.exercise.title.ru}
          replaySignal={replaySignal}
          fallback={
            <>
              <Mascot pose="front" className={styles.workKik} />
              <DemoSoonNote className={styles.workNote} />
            </>
          }
        />
      </div>

      <div className={styles.topArea}>
        <div className={styles.tiles}>
          <div
            className={styles.tileSet}
            aria-label={t('timer.work.setLabel', { n: turn.set + 1, total: turn.sets })}
          >
            <div className={styles.tileSetNumber}>
              {turn.set + 1}
              <span className={styles.tileSetOf}> {t('timer.work.of', { total: turn.sets })}</span>
            </div>
            <div className={styles.setPips} aria-hidden="true">
              {Array.from({ length: turn.sets }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < setsDone || i === turn.set ? `${styles.setPip} ${styles.setPipOn}` : styles.setPip
                  }
                />
              ))}
            </div>
          </div>
          <div className={styles.tileMain}>
            <div className={styles.tileMainNumber}>
              {timed
                ? inMinutes
                  ? Math.ceil(remaining / 60_000)
                  : Math.ceil(remaining / 1000)
                : item.volume.reps}
            </div>
            <div className={styles.tileMainUnit}>
              {timed
                ? t(inMinutes ? 'timer.work.min' : 'timer.work.sec')
                : t('timer.work.repsUnit', { count: item.volume.reps ?? 0 })}
            </div>
          </div>
          {timed && (
            <div className={styles.tileTime}>
              <div className={styles.tileTimeValue} role="timer">
                {formatClock(remaining)}
              </div>
              <div className={styles.bar} aria-hidden="true">
                <div
                  className={styles.barFill}
                  style={{ width: `${(1 - fractionElapsed(player, now)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.topRow}>
          <CloseButton />
          {turn.side !== null && (
            <span className={styles.sidePill}>
              {t(turn.side === 0 ? 'timer.work.sideFirst' : 'timer.work.sideSecond')}
            </span>
          )}
        </div>
      </div>

      <div className={styles.workBottom}>
        {mode === 'child' && <div className={styles.encourage}>{t('timer.work.encourage')}</div>}
        <div className={styles.controls}>
          <IconButton
            label={t('exercise.demo.replay')}
            size={56}
            onClick={() => setReplaySignal((n) => n + 1)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          <div className={styles.upNext}>{upNextText(player, t)}</div>
          <IconButton label={t('timer.work.skip')} size={56} onClick={() => send({ type: 'skip' })}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 5L16 12L6 19Z" fill="currentColor" />
              <rect x="17" y="5" width="2.6" height="14" fill="currentColor" />
            </svg>
          </IconButton>
          {timed ? (
            <IconButton
              label={t('timer.work.pause')}
              size={56}
              variant="ink"
              onClick={() => send({ type: 'pause' })}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
              </svg>
            </IconButton>
          ) : (
            <button type="button" className={styles.doneButton} onClick={() => send({ type: 'complete' })}>
              {t('timer.work.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Отдых (макет «Отдых»): огромное число, Кик в профиль, «Пропустить». */
export function RestView({ player, now }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const remaining = remainingMs(player, now) ?? 0;
  const rest = player.rest!;
  const turn = currentTurn(player);
  const next = rest.next === 'item' ? player.session.items[player.itemIndex + 1] : undefined;
  const seconds = Math.ceil(remaining / 1000);

  const caption =
    rest.kind === 'side'
      ? t('timer.rest.nextSide')
      : rest.kind === 'sets'
        ? t('timer.rest.nextSet', { n: turn.set + 1, total: turn.sets })
        : next
          ? t('timer.rest.nextItem', { title: next.exercise.title.ru })
          : '';

  return (
    <BigCountdown
      pose="side"
      label={rest.kind === 'side' ? t('timer.rest.sideTitle') : t('timer.rest.title')}
      value={seconds >= 60 ? formatClock(remaining) : String(seconds)}
      caption={caption}
      action={
        <Button size="lg" onClick={() => send({ type: 'skip' })}>
          {t('timer.rest.skip')}
        </Button>
      }
    />
  );
}

/** Оценка техники после упражнения блока А: одно нажатие — и дальше; можно пропустить. */
export function RatingView({ player }: ViewProps) {
  const { t } = useTranslation();
  const send = useUnit(playerEvent);
  const item = currentItem(player);
  const [hover, setHover] = useState(0);
  return (
    <div className={styles.finishScreen}>
      <Mascot pose="front" className={styles.finishKik} />
      <CloseButton className={styles.closeTopLeft} />
      <section className={styles.sheet}>
        <h1 className={styles.sheetTitleCenter}>{t('timer.rating.title')}</h1>
        <p className={styles.sheetMetaCenter}>{item.exercise.title.ru}</p>
        <p className={styles.sheetHint}>{t('timer.rating.hint')}</p>
        <div
          className={styles.stars}
          role="group"
          aria-label={t('timer.rating.title')}
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={styles.starButton}
              aria-label={t('timer.rating.star', { n })}
              onMouseEnter={() => setHover(n)}
              onClick={() => send({ type: 'rate', rating: n })}
            >
              <Star filled={n <= hover} size={30} />
            </button>
          ))}
        </div>
        <Button variant="ghost" fullWidth onClick={() => send({ type: 'rate', rating: null })}>
          {t('timer.rating.skip')}
        </Button>
      </section>
    </div>
  );
}

/** Итоги занятия (макет «Ура»): Кик, поздравление, средняя оценка, «На главную». */
export function DoneView({ player }: ViewProps) {
  const { t } = useTranslation();
  const leave = useUnit(sessionLeft);
  const [profile, plan] = useUnit([$profile, $plannedSessions]);
  const today = useToday();
  const streak = streakOf(plan, today);
  const minutes = Math.max(
    1,
    Math.round(((player.finishedAt ?? player.startedAt) - player.startedAt) / 60_000),
  );
  const rating = averageRating(player.results.map((r) => r.rating));
  const stars = rating === null ? 0 : Math.round(Number(rating.replace(',', '.')));
  return (
    <div className={styles.finishScreen}>
      <Mascot pose="front" className={styles.finishKik} />
      <section className={styles.sheet}>
        <h1 className={styles.sheetTitleCenter}>{t('timer.done.title', { name: profile?.name ?? '' })}</h1>
        <p className={styles.sheetMetaCenter}>
          {streak > 0
            ? t('timer.done.summary', { minutes, streak: t('timer.done.streakDays', { count: streak }) })
            : t('timer.done.minutesOnly', { minutes })}
        </p>
        {rating !== null && (
          <div className={styles.starsRow} role="img" aria-label={t('timer.done.rating', { value: rating })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} filled={n <= stars} size={34} />
            ))}
          </div>
        )}
        <Button to="/" size="lg" fullWidth onClick={() => leave()}>
          {t('timer.done.home')}
        </Button>
      </section>
    </div>
  );
}
