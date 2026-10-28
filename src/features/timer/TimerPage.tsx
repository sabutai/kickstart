import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { currentItem, currentTurn, type PlayerState } from '../../entities/session/player';
import { appLifecycle } from '../../shared/lib/platform';
import { Backdrop } from '../../shared/ui/Screen/Backdrop';
import { Button } from '../../shared/ui/Button/Button';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { EndDialog } from './EndDialog';
import { Overview } from './Overview';
import { $endDialogOpen, $player, endDialogOpened, playerEvent, timerScreenLeft } from './model';
import { DoneView, PrepareView, ReadyView, RatingView, RestView, WorkView } from './views';
import styles from './Timer.module.scss';

const TICK_MS = 250;

/**
 * Часы экрана. Время читается при рендере (useSyncExternalStore), поэтому после паузы или смены фазы
 * не мелькает устаревшее значение; интервал только будит перерисовку и подталкивает автопереходы
 * редьюсера (само время — из Date.now()).
 */
function useNow(running: boolean): number {
  const send = useUnit(playerEvent);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!running) return () => {};
      const id = setInterval(() => {
        send({ type: 'tick' });
        onChange();
      }, TICK_MS);
      return () => clearInterval(id);
    },
    [running, send],
  );
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / TICK_MS) * TICK_MS);
}

const VIEWS = {
  ready: ReadyView,
  prepare: PrepareView,
  work: WorkView,
  rest: RestView,
  rating: RatingView,
  done: DoneView,
} as const;

/** Текст для скринридера: объявляем смену фазы, а не каждую секунду. */
function announcement(player: PlayerState, t: ReturnType<typeof useTranslation>['t']): string {
  const item = currentItem(player);
  const turn = currentTurn(player);
  const title = item.exercise.title.ru;
  switch (player.phase) {
    case 'ready':
      return t('timer.announce.ready', { title });
    case 'prepare':
      return t('timer.announce.prepare', { title });
    case 'work':
      return t('timer.announce.work', { title, n: turn.set + 1, total: turn.sets });
    case 'rest':
      return t('timer.announce.rest');
    case 'rating':
      return t('timer.announce.rating', { title });
    case 'done':
      return t('timer.announce.done');
  }
}

function PlayerScreen({ player }: { player: PlayerState }) {
  const { t } = useTranslation();
  const [dialogOpen, openDialog, send] = useUnit([$endDialogOpen, endDialogOpened, playerEvent]);
  const ticking = player.phaseDurationMs !== null && player.pausedAt === null && player.phase !== 'done';
  const now = useNow(ticking);

  // Свернули приложение — автопауза: время не должно уходить, пока ребёнок не смотрит.
  useEffect(() => appLifecycle.onActiveChange((active) => !active && send({ type: 'pause' })), [send]);

  const View = VIEWS[player.phase];
  const item = currentItem(player);
  const partIndex = player.session.parts.indexOf(item.partKind) + 1;
  const done = player.phase === 'done';
  const paused = player.pausedAt !== null && !dialogOpen && !done;

  return (
    <main className={styles.screen}>
      <Backdrop background="timer" pitchLines />
      {!done && (
        <div className={styles.top}>
          <span className={styles.category}>
            <span className={styles.partNo}>
              {t('timer.partProgress', { n: partIndex, total: player.session.parts.length })}
            </span>
          </span>
          <IconButton label={t('timer.close')} onClick={() => openDialog()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
      )}

      <div className={styles.content}>
        <View player={player} now={now} />
      </div>

      {!done && (
        <div className={styles.bottom}>
          <button type="button" className={styles.endLink} onClick={() => openDialog()}>
            {t('timer.end')}
          </button>
        </div>
      )}

      <p className="sr-only" role="status">
        {announcement(player, t)}
      </p>

      {paused && (
        <div className={styles.overlay}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="pause-title">
            <h2 id="pause-title" className={styles.title}>
              {t('timer.paused.title')}
            </h2>
            <Button size="lg" fullWidth autoFocus onClick={() => send({ type: 'resume' })}>
              {t('timer.paused.resume')}
            </Button>
          </div>
        </div>
      )}
      {dialogOpen && <EndDialog player={player} />}
    </main>
  );
}

export function TimerPage() {
  const [player, leave] = useUnit([$player, timerScreenLeft]);
  // Ушли с экрана: занятие встаёт на паузу (время не убегает), итоги убираются.
  useEffect(() => () => leave(), [leave]);
  return player ? <PlayerScreen player={player} /> : <Overview />;
}
