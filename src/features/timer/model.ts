import { createEffect, createEvent, createStore, sample } from 'effector';
import { sessionLogged } from '../../entities/progress/model';
import { $exerciseLevels } from '../../entities/progress/model';
import { $plannedSessions, $schedule, sessionDone } from '../../entities/schedule/model';
import {
  programCompleted,
  reducePlayer,
  toSessionLog,
  type PlayerEvent,
  type PlayerState,
} from '../../entities/session/player';
import { startPlayer } from '../../entities/session/start';
import { toKey } from '../../shared/lib/dates';
import { haptics, keepAwake } from '../../shared/lib/platform';

/** Текущее занятие в проигрывателе; null — занятие не идёт. */
export const $player = createStore<PlayerState | null>(null);
/** Какое занятие плана проходим (его отметим выполненным). */
export const $planId = createStore<string | null>(null);

/** «Поехали» на обзоре: собрать и запустить занятие на сегодня. */
export const startRequested = createEvent();
/** Любое действие проигрывателя; время берётся из Date.now() в момент события. */
export const playerEvent = createEvent<PlayerEvent>();
/** Убрать состояние (кнопка «На главную» после итогов, выход без записи, уход с экрана после итогов). */
export const sessionLeft = createEvent();

/** Ушли с экрана таймера: занятие идёт — ставим на паузу; уже закончено — убираем итоги. */
export const timerScreenLeft = createEvent();

export const endDialogOpened = createEvent();
export const endDialogClosed = createEvent(); // «Продолжить»
/** Выбор в диалоге завершения: засчитать (если блок А пройден) или выйти без записи. */
export const endChosen = createEvent<'save' | 'discard'>();

const started = createEvent<{ planId: string; player: PlayerState } | null>();

$player
  .on(started, (_, run) => run?.player ?? null)
  .on(playerEvent, (state, event) => (state ? reducePlayer(state, event, Date.now()) : state))
  .reset(sessionLeft);
$planId.on(started, (_, run) => run?.planId ?? null).reset(sessionLeft);

// Запуск: только если занятие ещё не идёт (вернулись на вкладку «Таймер» посреди тренировки).
sample({
  clock: startRequested,
  source: { current: $player, plan: $plannedSessions, schedule: $schedule, levelOf: $exerciseLevels },
  filter: ({ current }) => current === null,
  fn: ({ plan, schedule, levelOf }) =>
    startPlayer({ plan, schedule, levelOf, today: toKey(new Date()), now: Date.now() }),
  target: started,
});

sample({
  clock: timerScreenLeft,
  source: $player,
  filter: (state) => state !== null && state.phase !== 'done',
  fn: (): PlayerEvent => ({ type: 'pause' }),
  target: playerEvent,
});
sample({
  clock: timerScreenLeft,
  source: $player,
  filter: (state) => state?.phase === 'done',
  target: sessionLeft,
});

// --- диалог завершения ---

export const $endDialogOpen = createStore(false)
  .on(endDialogOpened, () => true)
  .on([endDialogClosed, endChosen, sessionLeft], () => false);

// Пока диалог открыт, время стоит.
sample({ clock: endDialogOpened, fn: (): PlayerEvent => ({ type: 'pause' }), target: playerEvent });
sample({ clock: endDialogClosed, fn: (): PlayerEvent => ({ type: 'resume' }), target: playerEvent });

sample({
  clock: endChosen,
  source: $player,
  filter: (player, choice) => choice === 'save' && player !== null && programCompleted(player),
  fn: (): PlayerEvent => ({ type: 'finish' }),
  target: playerEvent,
});
sample({ clock: endChosen, filter: (choice) => choice === 'discard', target: sessionLeft });

// --- запись результата: один раз, когда занятие дошло до «done» (естественно или «засчитать и выйти») ---

const finished = sample({
  clock: $player.updates,
  filter: (state): state is PlayerState => state !== null && state.phase === 'done',
});

sample({
  clock: finished,
  source: $planId,
  filter: (planId, state) => planId !== null && programCompleted(state) && toSessionLog(state).length > 0,
  fn: (planId, state) => ({
    sessionId: planId!,
    startedAt: new Date(state.startedAt).toISOString(),
    finishedAt: new Date(state.finishedAt ?? state.startedAt).toISOString(),
    items: toSessionLog(state),
  }),
  target: sessionLogged,
});

sample({
  clock: finished,
  source: $planId,
  // Засчитываем, только если что-то реально сделано: тренировка, где всё пропустили, не выполнена.
  filter: (planId, state) => planId !== null && programCompleted(state) && toSessionLog(state).length > 0,
  fn: (planId) => ({ id: planId! }),
  target: sessionDone,
});

// --- платформа: вибрация на смене фазы, экран не гаснет во время занятия ---

const hapticFx = createEffect(() => haptics.tap());
const keepAwakeFx = createEffect((on: boolean) => (on ? keepAwake.on() : keepAwake.off()));

const $phaseKey = $player.map((s) => (s ? `${s.itemIndex}:${s.turnIndex}:${s.phase}` : null));
sample({ clock: $phaseKey.updates, filter: (key) => key !== null, target: hapticFx });

/** Занятие идёт (не закончено): для keep-awake и перехвата аппаратной «Назад». */
export const $sessionActive = $player.map((s) => s !== null && s.phase !== 'done');
sample({ clock: $sessionActive.updates, target: keepAwakeFx });
