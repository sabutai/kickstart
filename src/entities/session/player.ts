import type { BuiltSession, SessionItem } from './build';

// Машина состояний проигрывателя (docs/architecture.md → «Проигрыватель»). Чистый редьюсер:
// время приходит снаружи (из Date.now()), тиков внутри нет. У таймерных фаз есть момент старта и
// длительность, остаток считается как «конец − сейчас», поэтому ничего не дрейфует при сворачивании.
// Автопереходы считаются от момента окончания прошлой фазы, а не от «сейчас» — без накопления ошибки.

/** Пауза «Приготовься» перед упражнениями, которые стартуют сами. */
export const PREPARE_SEC = 5;
/** Короткая смена стороны между двумя сторонами одного подхода. */
export const SIDE_SWITCH_SEC = 5;

export type Phase =
  | 'ready' // ждём «Начать» (блок А и игры: нужно приготовиться взрослому)
  | 'prepare' // «Приготовься» с обратным отсчётом, потом работа сама
  | 'work' // подход: на время — по таймеру, на повторы — по кнопке «Готово»
  | 'rest'
  | 'rating' // оценка техники после упражнения блока А
  | 'done';

export type RestInfo = {
  /** Между подходами, между сторонами одного подхода или между упражнениями. */
  kind: 'sets' | 'side' | 'exercise';
  /** Что идёт после отдыха: следующий подход этого же упражнения или следующее упражнение. */
  next: 'turn' | 'item';
};

export type ItemResult = { setsDone: number; rating: number | null };

export type PlayerState = {
  session: BuiltSession;
  itemIndex: number;
  /** Номер «хода» внутри упражнения: подходы × стороны. Во время отдыха — предстоящий ход. */
  turnIndex: number;
  phase: Phase;
  phaseStartedAt: number;
  /** null — фаза без таймера (ждём действие). */
  phaseDurationMs: number | null;
  pausedAt: number | null;
  rest: RestInfo | null;
  results: ItemResult[];
  /** Сколько упражнений полностью закончено (нужно, чтобы понять, пройден ли блок А). */
  completedItems: number;
  startedAt: number;
  finishedAt: number | null;
};

export type PlayerEvent =
  | { type: 'begin' } // «Начать»
  | { type: 'complete' } // «Готово» (подход на повторы)
  | { type: 'skip' } // «Дальше»
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tick' } // время прошло: выполнить автопереходы
  | { type: 'rate'; rating: number | null }
  | { type: 'finish' }; // завершить досрочно

const MAX_CHAIN = 500;
const ms = (sec: number) => sec * 1000;

export const currentItem = (state: PlayerState): SessionItem => state.session.items[state.itemIndex]!;

const turnsOf = (item: SessionItem): number => item.volume.sets * (item.volume.perSide ? 2 : 1);

/** Подход и сторона текущего (или предстоящего, если идёт отдых) хода. */
export function currentTurn(state: PlayerState): { set: number; sets: number; side: 0 | 1 | null } {
  const { volume } = currentItem(state);
  return {
    set: volume.perSide ? Math.floor(state.turnIndex / 2) : state.turnIndex,
    sets: volume.sets,
    side: volume.perSide ? ((state.turnIndex % 2) as 0 | 1) : null,
  };
}

export function remainingMs(state: PlayerState, now: number): number | null {
  if (state.phaseDurationMs === null) return null;
  const reference = state.pausedAt ?? now;
  // Не больше длительности: часы экрана квантуются и могут оказаться чуть раньше начала фазы.
  return Math.min(
    state.phaseDurationMs,
    Math.max(0, state.phaseStartedAt + state.phaseDurationMs - reference),
  );
}

/** Доля пройденного времени фазы 0–1 (для кольца); у фаз без таймера — 0. */
export function fractionElapsed(state: PlayerState, now: number): number {
  const remaining = remainingMs(state, now);
  if (remaining === null || !state.phaseDurationMs) return 0;
  return Math.min(1, Math.max(0, 1 - remaining / state.phaseDurationMs));
}

/** Блок А целиком пройден (или его нет): после этого занятие можно засчитать при досрочном выходе. */
export function programCompleted(state: PlayerState): boolean {
  const last = state.session.items.findLastIndex((i) => i.partKind === 'program');
  return last === -1 || state.completedItems > last;
}

/** Записи для журнала: только упражнения с зачтёнными подходами. */
export function toSessionLog(state: PlayerState) {
  return state.session.items.flatMap((item, i) => {
    const result = state.results[i]!;
    if (result.setsDone <= 0) return [];
    return [
      {
        exerciseId: item.exercise.id,
        level: item.level,
        setsDone: result.setsDone,
        ...(result.rating !== null ? { techniqueRating: result.rating } : {}),
      },
    ];
  });
}

// --- переходы ---

const enterItem = (state: PlayerState, itemIndex: number, at: number): PlayerState => {
  const item = state.session.items[itemIndex]!;
  const waits = item.partKind === 'program' || item.partKind === 'game';
  return {
    ...state,
    itemIndex,
    turnIndex: 0,
    rest: null,
    phase: waits ? 'ready' : 'prepare',
    phaseStartedAt: at,
    phaseDurationMs: waits ? null : ms(PREPARE_SEC),
  };
};

const startWork = (state: PlayerState, at: number): PlayerState => {
  const { volume } = currentItem(state);
  // На повторы — без таймера (по кнопке «Готово»); иначе по времени работы.
  const duration = volume.reps !== undefined || volume.workSec === undefined ? null : ms(volume.workSec);
  return { ...state, rest: null, phase: 'work', phaseStartedAt: at, phaseDurationMs: duration };
};

const startRest = (state: PlayerState, rest: RestInfo, seconds: number, at: number): PlayerState => ({
  ...state,
  rest,
  phase: 'rest',
  phaseStartedAt: at,
  phaseDurationMs: ms(seconds),
});

const finish = (state: PlayerState, at: number): PlayerState => ({
  ...state,
  phase: 'done',
  rest: null,
  pausedAt: null,
  phaseStartedAt: at,
  phaseDurationMs: null,
  finishedAt: at,
});

/** Упражнение закончено (и оценено, если нужно): отдых до следующего или конец занятия. */
const afterItem = (state: PlayerState, at: number): PlayerState => {
  if (state.itemIndex >= state.session.items.length - 1) return finish(state, at);
  const { restSec } = currentItem(state).volume;
  return restSec > 0
    ? startRest(state, { kind: 'exercise', next: 'item' }, restSec, at)
    : enterItem(state, state.itemIndex + 1, at);
};

const finishItem = (state: PlayerState, at: number): PlayerState => {
  const done = { ...state, completedItems: Math.max(state.completedItems, state.itemIndex + 1) };
  // Технику оценивают только в блоке А — от неё зависит повышение уровня.
  if (currentItem(done).partKind === 'program') {
    return { ...done, phase: 'rating', phaseStartedAt: at, phaseDurationMs: null, rest: null };
  }
  return afterItem(done, at);
};

/** Ход (подход или его сторона) закончен. counted — засчитывать ли подход. */
const finishTurn = (state: PlayerState, at: number, counted: boolean): PlayerState => {
  const item = currentItem(state);
  const { perSide, restSec } = item.volume;
  const closesSet = !perSide || state.turnIndex % 2 === 1;
  let next = state;
  if (counted && closesSet) {
    const results = state.results.map((r, i) =>
      i === state.itemIndex ? { ...r, setsDone: r.setsDone + 1 } : r,
    );
    next = { ...state, results };
  }
  if (state.turnIndex + 1 >= turnsOf(item)) return finishItem(next, at);

  const advanced = { ...next, turnIndex: state.turnIndex + 1 };
  if (perSide && state.turnIndex % 2 === 0) {
    return startRest(advanced, { kind: 'side', next: 'turn' }, SIDE_SWITCH_SEC, at);
  }
  return restSec > 0
    ? startRest(advanced, { kind: 'sets', next: 'turn' }, restSec, at)
    : startWork(advanced, at);
};

const endRest = (state: PlayerState, at: number): PlayerState =>
  state.rest?.next === 'item' ? enterItem(state, state.itemIndex + 1, at) : startWork(state, at);

/** Выполняет все автопереходы, чьё время уже вышло (цепочкой, от моментов окончания фаз). */
const advance = (state: PlayerState, now: number): PlayerState => {
  let s = state;
  for (let i = 0; i < MAX_CHAIN; i++) {
    if (s.pausedAt !== null || s.phaseDurationMs === null || s.phase === 'done') return s;
    const end = s.phaseStartedAt + s.phaseDurationMs;
    if (now < end) return s;
    if (s.phase === 'prepare') s = startWork(s, end);
    else if (s.phase === 'work') s = finishTurn(s, end, true);
    else if (s.phase === 'rest') s = endRest(s, end);
    else return s;
  }
  return s;
};

export function createPlayer(session: BuiltSession, now: number): PlayerState {
  const base: PlayerState = {
    session,
    itemIndex: 0,
    turnIndex: 0,
    phase: 'done',
    phaseStartedAt: now,
    phaseDurationMs: null,
    pausedAt: null,
    rest: null,
    results: session.items.map(() => ({ setsDone: 0, rating: null })),
    completedItems: 0,
    startedAt: now,
    finishedAt: null,
  };
  return session.items.length === 0 ? finish(base, now) : enterItem(base, 0, now);
}

const isValidRating = (rating: number | null): boolean =>
  rating === null || (Number.isInteger(rating) && rating >= 1 && rating <= 5);

export function reducePlayer(state: PlayerState, event: PlayerEvent, now: number): PlayerState {
  if (state.phase === 'done') return state;

  switch (event.type) {
    case 'tick':
      return advance(state, now);

    case 'begin':
      return state.phase === 'ready' ? startWork(state, now) : state;

    case 'complete':
      return state.phase === 'work' && state.phaseDurationMs === null ? finishTurn(state, now, true) : state;

    case 'skip':
      if (state.phase === 'ready' || state.phase === 'prepare') return startWork(state, now);
      if (state.phase === 'work') return finishTurn(state, now, false);
      if (state.phase === 'rest') return endRest(state, now);
      if (state.phase === 'rating') return reducePlayer(state, { type: 'rate', rating: null }, now);
      return state;

    case 'rate': {
      if (state.phase !== 'rating' || !isValidRating(event.rating)) return state;
      const results = state.results.map((r, i) =>
        i === state.itemIndex ? { ...r, rating: event.rating } : r,
      );
      return afterItem({ ...state, results }, now);
    }

    case 'pause':
      return state.pausedAt === null && state.phaseDurationMs !== null ? { ...state, pausedAt: now } : state;

    case 'resume':
      return state.pausedAt === null
        ? state
        : { ...state, phaseStartedAt: state.phaseStartedAt + (now - state.pausedAt), pausedAt: null };

    case 'finish':
      return finish(state, now);
  }
}

export type UpNext =
  | { kind: 'rest'; seconds: number } // следующий подход (после отдыха; 0 — сразу)
  | { kind: 'side'; seconds: number } // смена стороны
  | { kind: 'rating' } // оценка техники
  | { kind: 'item'; item: SessionItem; restSec: number } // следующее упражнение
  | { kind: 'end' }; // конец занятия

/** Что будет после текущего хода — для строки «Далее: …». */
export function upNext(state: PlayerState): UpNext {
  const item = currentItem(state);
  const { perSide, restSec } = item.volume;
  if (state.turnIndex + 1 < turnsOf(item)) {
    return perSide && state.turnIndex % 2 === 0
      ? { kind: 'side', seconds: SIDE_SWITCH_SEC }
      : { kind: 'rest', seconds: restSec };
  }
  if (item.partKind === 'program') return { kind: 'rating' };
  const next = state.session.items[state.itemIndex + 1];
  return next ? { kind: 'item', item: next, restSec } : { kind: 'end' };
}
