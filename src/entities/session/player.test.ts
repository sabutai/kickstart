import { describe, expect, it } from 'vitest';
import { getExercise } from '../../content';
import type { SessionPartKind } from '../../content/schema';
import type { BuiltSession, SessionItem, SessionVolume } from './build';
import {
  PREPARE_SEC,
  SIDE_SWITCH_SEC,
  createPlayer,
  currentItem,
  currentTurn,
  fractionElapsed,
  programCompleted,
  reducePlayer,
  remainingMs,
  toSessionLog,
  upNext,
  type PlayerEvent,
  type PlayerState,
} from './player';

const S = 1000; // мс в секунде

const item = (id: string, partKind: SessionPartKind, volume: Partial<SessionVolume> = {}): SessionItem => ({
  exercise: getExercise(id)!,
  level: 1,
  partKind,
  volume: { sets: 1, workSec: 10, perSide: false, restSec: 0, ...volume },
});

const session = (...items: SessionItem[]): BuiltSession => ({
  parts: [...new Set(items.map((i) => i.partKind))],
  items,
});

const run = (state: PlayerState, now: number, ...events: PlayerEvent['type'][]) =>
  events.reduce((s, type) => reducePlayer(s, { type } as PlayerEvent, now), state);

const at = (state: PlayerState, now: number, event: PlayerEvent) => reducePlayer(state, event, now);

describe('создание и вступление к упражнению', () => {
  it('первое упражнение блока А и игры ждут кнопку «Начать»', () => {
    expect(createPlayer(session(item('alertness-run', 'program')), 0).phase).toBe('ready');
    expect(createPlayer(session(item('traffic-light', 'game')), 0).phase).toBe('ready');
  });

  it('упражнения блоков Б, В и мобильности стартуют сами после «Приготовься»', () => {
    for (const [id, part] of [
      ['toe-taps', 'ball'],
      ['ladder', 'feet'],
      ['deep-squat', 'cooldown'],
    ] as const) {
      const p = createPlayer(session(item(id, part)), 1000);
      expect(p.phase).toBe('prepare');
      expect(remainingMs(p, 1000)).toBe(PREPARE_SEC * S);
    }
  });

  it('пустое занятие сразу завершено', () => {
    expect(createPlayer({ parts: [], items: [] }, 5).phase).toBe('done');
  });
});

describe('работа на время', () => {
  const base = session(
    item('press-up-plank', 'program', { sets: 2, workSec: 15, restSec: 20 }),
    item('spiderman', 'program', { workSec: 10 }),
  );

  it('«Начать» запускает таймер на время работы; остаток считается от переданного now', () => {
    const p = at(createPlayer(base, 0), 100, { type: 'begin' });
    expect(p.phase).toBe('work');
    expect(remainingMs(p, 100)).toBe(15 * S);
    expect(remainingMs(p, 5100)).toBe(10 * S);
    expect(remainingMs(p, 999_999)).toBe(0);
    expect(fractionElapsed(p, 5100)).toBeCloseTo(1 / 3);
  });

  it('если «сейчас» чуть раньше старта фазы (кванты часов), остаток не превышает длительность', () => {
    const p = at(createPlayer(base, 0), 1_000, { type: 'begin' });
    expect(remainingMs(p, 900)).toBe(15 * S);
    expect(fractionElapsed(p, 900)).toBe(0);
  });

  it('до конца времени tick ничего не меняет, по окончании — отдых между подходами', () => {
    const p = at(createPlayer(base, 0), 0, { type: 'begin' });
    expect(at(p, 14_999, { type: 'tick' })).toEqual(p);
    const rest = at(p, 15_000, { type: 'tick' });
    expect(rest.phase).toBe('rest');
    expect(remainingMs(rest, 15_000)).toBe(20 * S);
    expect(rest.results[0]!.setsDone).toBe(1);
  });

  it('после отдыха — второй подход; после него (блок А) — оценка техники', () => {
    let p = at(createPlayer(base, 0), 0, { type: 'begin' });
    p = at(p, 15_000, { type: 'tick' });
    p = at(p, 35_000, { type: 'tick' });
    expect(p.phase).toBe('work');
    expect(currentTurn(p)).toMatchObject({ set: 1, sets: 2 });
    p = at(p, 50_000, { type: 'tick' });
    expect(p.phase).toBe('rating');
    expect(p.results[0]!.setsDone).toBe(2);
  });

  it('время не накапливает дрейф: цепочка фаз считается от моментов окончания, а не от «сейчас»', () => {
    const p = at(createPlayer(base, 0), 0, { type: 'begin' });
    // тик пришёл поздно, на 40-й секунде: работа 0–15, отдых 15–35, второй подход начался в 35.
    const late = at(p, 40_000, { type: 'tick' });
    expect(late.phase).toBe('work');
    expect(late.phaseStartedAt).toBe(35_000);
    expect(remainingMs(late, 40_000)).toBe(10 * S);
  });

  it('очень поздний тик проходит все фазы подряд и останавливается на ожидании оценки', () => {
    const p = at(createPlayer(base, 0), 0, { type: 'begin' });
    const late = at(p, 10_000_000, { type: 'tick' });
    expect(late.phase).toBe('rating');
    expect(late.results[0]!.setsDone).toBe(2);
  });
});

describe('пауза', () => {
  const base = session(item('press-up-plank', 'program', { workSec: 15 }));

  it('пока пауза, время стоит: остаток не меняется и tick ничего не делает', () => {
    let p = at(createPlayer(base, 0), 0, { type: 'begin' });
    p = at(p, 5_000, { type: 'pause' });
    expect(p.pausedAt).toBe(5_000);
    expect(remainingMs(p, 5_000)).toBe(10 * S);
    expect(remainingMs(p, 500_000)).toBe(10 * S);
    expect(at(p, 500_000, { type: 'tick' })).toEqual(p);
  });

  it('после «Продолжить» доиграет ровно оставшееся время', () => {
    let p = at(createPlayer(base, 0), 0, { type: 'begin' });
    p = at(p, 5_000, { type: 'pause' });
    p = at(p, 100_000, { type: 'resume' });
    expect(p.pausedAt).toBeNull();
    expect(remainingMs(p, 100_000)).toBe(10 * S);
    expect(at(p, 109_999, { type: 'tick' }).phase).toBe('work');
    expect(at(p, 110_000, { type: 'tick' }).phase).toBe('rating');
  });

  it('двойная пауза и «Продолжить» без паузы безвредны', () => {
    let p = at(createPlayer(base, 0), 0, { type: 'begin' });
    p = at(p, 5_000, { type: 'pause' });
    expect(at(p, 9_000, { type: 'pause' }).pausedAt).toBe(5_000);
    expect(at(createPlayer(base, 0), 3, { type: 'resume' })).toEqual(createPlayer(base, 0));
  });

  it('пауза возможна только там, где идёт таймер', () => {
    const ready = createPlayer(base, 0);
    expect(at(ready, 1, { type: 'pause' })).toEqual(ready);
    const reps = at(
      createPlayer(session(item('alertness-run', 'program', { reps: 5, workSec: undefined })), 0),
      0,
      { type: 'begin' },
    );
    expect(at(reps, 1, { type: 'pause' })).toEqual(reps);
  });

  it('паузу можно поставить на «Приготовься» и на отдыхе', () => {
    const prep = createPlayer(session(item('toe-taps', 'ball', { sets: 2, workSec: 30, restSec: 20 })), 0);
    const paused = at(prep, 2_000, { type: 'pause' });
    expect(remainingMs(paused, 50_000)).toBe((PREPARE_SEC - 2) * S);
    const resumed = at(paused, 50_000, { type: 'resume' });
    expect(at(resumed, 53_000, { type: 'tick' }).phase).toBe('work');
  });
});

describe('упражнения на повторы', () => {
  const reps = session(
    item('alertness-run', 'program', { sets: 2, reps: 5, workSec: undefined, restSec: 30 }),
  );

  it('таймера нет: tick не сдвигает, подход закрывает «Готово»', () => {
    let p = at(createPlayer(reps, 0), 0, { type: 'begin' });
    expect(remainingMs(p, 1)).toBeNull();
    expect(fractionElapsed(p, 1)).toBe(0);
    expect(at(p, 9_999_999, { type: 'tick' })).toEqual(p);
    p = at(p, 7_000, { type: 'complete' });
    expect(p.phase).toBe('rest');
    expect(p.results[0]!.setsDone).toBe(1);
    expect(remainingMs(p, 7_000)).toBe(30 * S);
  });

  it('«Готово» вне фазы работы или на таймерном подходе игнорируется', () => {
    const ready = createPlayer(reps, 0);
    expect(at(ready, 1, { type: 'complete' })).toEqual(ready);
    const timed = at(createPlayer(session(item('press-up-plank', 'program', { workSec: 15 })), 0), 0, {
      type: 'begin',
    });
    expect(at(timed, 1, { type: 'complete' })).toEqual(timed);
  });
});

describe('упражнения на обе стороны', () => {
  const both = session(
    item('skating-jumps', 'program', { sets: 2, reps: 5, workSec: undefined, perSide: true, restSec: 30 }),
  );

  it('подход = две стороны подряд с короткой сменой; подход засчитывается после второй', () => {
    let p = at(createPlayer(both, 0), 0, { type: 'begin' });
    expect(currentTurn(p)).toEqual({ set: 0, sets: 2, side: 0 });
    p = at(p, 1_000, { type: 'complete' });
    expect(p.phase).toBe('rest');
    expect(p.rest).toEqual({ kind: 'side', next: 'turn' });
    expect(remainingMs(p, 1_000)).toBe(SIDE_SWITCH_SEC * S);
    expect(p.results[0]!.setsDone).toBe(0);

    p = at(p, 1_000 + SIDE_SWITCH_SEC * S, { type: 'tick' });
    expect(currentTurn(p)).toEqual({ set: 0, sets: 2, side: 1 });
    p = at(p, 20_000, { type: 'complete' });
    expect(p.results[0]!.setsDone).toBe(1);
    expect(p.rest).toEqual({ kind: 'sets', next: 'turn' });
    expect(remainingMs(p, 20_000)).toBe(30 * S);

    p = at(p, 50_000, { type: 'tick' });
    expect(currentTurn(p)).toEqual({ set: 1, sets: 2, side: 0 });
  });

  it('всего 4 подхода-стороны для 2 подходов', () => {
    let p = at(createPlayer(both, 0), 0, { type: 'begin' });
    let works = 0;
    for (let i = 0; i < 40 && p.phase !== 'rating'; i++) {
      if (p.phase === 'work') {
        works++;
        p = at(p, 1_000_000 + i * 100_000, { type: 'complete' });
      } else {
        p = at(p, 1_000_000 + i * 100_000, { type: 'skip' });
      }
    }
    expect(works).toBe(4);
    expect(p.results[0]!.setsDone).toBe(2);
  });
});

describe('«Дальше» (skip)', () => {
  it('в «Начать» и «Приготовься» запускает работу', () => {
    expect(at(createPlayer(session(item('alertness-run', 'program')), 0), 5, { type: 'skip' }).phase).toBe(
      'work',
    );
    const prep = at(createPlayer(session(item('toe-taps', 'ball')), 0), 2_000, { type: 'skip' });
    expect(prep.phase).toBe('work');
    expect(prep.phaseStartedAt).toBe(2_000);
  });

  it('в работе пропускает подход без зачёта', () => {
    const p = at(
      at(
        createPlayer(session(item('press-up-plank', 'program', { sets: 2, workSec: 15, restSec: 20 })), 0),
        0,
        { type: 'begin' },
      ),
      3_000,
      { type: 'skip' },
    );
    expect(p.phase).toBe('rest');
    expect(p.results[0]!.setsDone).toBe(0);
  });

  it('на отдыхе — сразу к следующему подходу', () => {
    let p = at(
      createPlayer(session(item('press-up-plank', 'program', { sets: 2, workSec: 15, restSec: 20 })), 0),
      0,
      { type: 'begin' },
    );
    p = at(p, 15_000, { type: 'tick' });
    p = at(p, 16_000, { type: 'skip' });
    expect(p.phase).toBe('work');
    expect(p.phaseStartedAt).toBe(16_000);
  });
});

describe('оценка техники и переходы между упражнениями', () => {
  const two = session(
    item('press-up-plank', 'program', { workSec: 10, restSec: 30 }),
    item('toe-taps', 'ball', { workSec: 10, restSec: 20 }),
    item('ladder', 'feet', { workSec: 10, restSec: 0 }),
    item('deep-squat', 'cooldown', { workSec: 10 }),
  );

  const toRating = () => at(at(createPlayer(two, 0), 0, { type: 'begin' }), 10_000, { type: 'tick' });

  it('после упражнения блока А ждём оценку', () => {
    const p = toRating();
    expect(p.phase).toBe('rating');
    expect(p.phaseDurationMs).toBeNull();
    expect(at(p, 99_999_999, { type: 'tick' })).toEqual(p);
  });

  it('оценка записывается; затем отдых между упражнениями и вступление к следующему', () => {
    let p = at(toRating(), 12_000, { type: 'rate', rating: 4 });
    expect(p.results[0]!.rating).toBe(4);
    expect(p.phase).toBe('rest');
    expect(p.rest).toEqual({ kind: 'exercise', next: 'item' });
    expect(remainingMs(p, 12_000)).toBe(30 * S);
    p = at(p, 42_000, { type: 'tick' });
    expect(p.itemIndex).toBe(1);
    expect(p.phase).toBe('prepare');
    expect(p.phaseStartedAt).toBe(42_000);
  });

  it('оценку можно пропустить: рейтинга нет, а ход занятия тот же', () => {
    const p = at(toRating(), 12_000, { type: 'rate', rating: null });
    expect(p.results[0]!.rating).toBeNull();
    expect(p.phase).toBe('rest');
  });

  it('«Дальше» на экране оценки равно «пропустить оценку»', () => {
    expect(at(toRating(), 12_000, { type: 'skip' }).results[0]!.rating).toBeNull();
  });

  it('оценка вне фазы оценки игнорируется; значения вне 1–5 тоже', () => {
    const working = at(createPlayer(two, 0), 0, { type: 'begin' });
    expect(at(working, 1, { type: 'rate', rating: 5 })).toEqual(working);
    const rating = toRating();
    expect(at(rating, 1, { type: 'rate', rating: 9 })).toEqual(rating);
    expect(at(rating, 1, { type: 'rate', rating: 0 })).toEqual(rating);
  });

  it('упражнение вне блока А оценки не просит; без отдыха сразу следующее', () => {
    let p = createPlayer(
      session(
        item('ladder', 'feet', { workSec: 10, restSec: 0 }),
        item('line-hops', 'feet', { workSec: 10 }),
      ),
      0,
    );
    p = at(p, 5_000, { type: 'tick' }); // приготовиться → работа
    p = at(p, 15_000, { type: 'tick' }); // работа кончилась
    expect(p.itemIndex).toBe(1);
    expect(p.phase).toBe('prepare');
  });

  it('последнее упражнение завершает занятие', () => {
    let p = createPlayer(session(item('deep-squat', 'cooldown', { workSec: 10 })), 0);
    p = at(p, 5_000, { type: 'tick' });
    p = at(p, 15_000, { type: 'tick' });
    expect(p.phase).toBe('done');
    expect(p.finishedAt).toBe(15_000);
    expect(p.results[0]!.setsDone).toBe(1);
  });

  it('после завершения события не меняют состояние', () => {
    const done = createPlayer({ parts: [], items: [] }, 5);
    for (const type of ['begin', 'complete', 'skip', 'pause', 'resume', 'tick'] as const) {
      expect(at(done, 10, { type })).toEqual(done);
    }
  });
});

describe('программа считана и итоговый журнал', () => {
  const full = session(
    item('alertness-run', 'program', { reps: 3, workSec: undefined }),
    item('spiderman', 'program', { workSec: 10 }),
    item('toe-taps', 'ball', { workSec: 10 }),
  );

  it('programCompleted: false, пока не пройден последний элемент блока А; true — после', () => {
    let p = at(createPlayer(full, 0), 0, { type: 'begin' });
    expect(programCompleted(p)).toBe(false);
    p = at(p, 1, { type: 'complete' }); // первое упражнение закончено, ждём оценку
    expect(programCompleted(p)).toBe(false);
    p = at(p, 2, { type: 'rate', rating: 5 });
    p = run(p, 3, 'begin');
    p = at(p, 20_000, { type: 'tick' }); // второе упражнение закончено → оценка
    expect(p.phase).toBe('rating');
    expect(programCompleted(p)).toBe(true);
  });

  it('programCompleted без блока А — сразу true', () => {
    expect(programCompleted(createPlayer(session(item('toe-taps', 'ball')), 0))).toBe(true);
  });

  it('finish() завершает досрочно и сохраняет сделанное', () => {
    let p = at(createPlayer(full, 0), 0, { type: 'begin' });
    p = at(p, 1_000, { type: 'complete' });
    p = at(p, 2_000, { type: 'rate', rating: 3 });
    const ended = at(p, 3_000, { type: 'finish' });
    expect(ended.phase).toBe('done');
    expect(ended.finishedAt).toBe(3_000);
    expect(ended.results[0]).toEqual({ setsDone: 1, rating: 3 });
  });

  it('toSessionLog: только упражнения с зачтёнными подходами, с уровнем и оценкой', () => {
    let p = at(createPlayer(full, 0), 0, { type: 'begin' });
    p = at(p, 1_000, { type: 'complete' });
    p = at(p, 2_000, { type: 'rate', rating: 4 });
    const log = toSessionLog(at(p, 3_000, { type: 'finish' }));
    expect(log).toEqual([{ exerciseId: 'alertness-run', level: 1, setsDone: 1, techniqueRating: 4 }]);
  });

  it('toSessionLog: без оценки поле techniqueRating не пишется', () => {
    let p = at(createPlayer(full, 0), 0, { type: 'begin' });
    p = at(p, 1_000, { type: 'complete' });
    p = at(p, 2_000, { type: 'rate', rating: null });
    const [first] = toSessionLog(at(p, 3_000, { type: 'finish' }));
    expect(first).not.toHaveProperty('techniqueRating');
  });

  it('currentItem — упражнение, на котором стоим', () => {
    expect(currentItem(createPlayer(full, 0)).exercise.id).toBe('alertness-run');
  });
});

describe('upNext («Далее: …»)', () => {
  const wk = (state: PlayerState) => upNext(state);

  it('следующий подход через отдых', () => {
    const p = at(
      createPlayer(session(item('press-up-plank', 'program', { sets: 2, workSec: 15, restSec: 20 })), 0),
      0,
      { type: 'begin' },
    );
    expect(wk(p)).toEqual({ kind: 'rest', seconds: 20 });
  });

  it('смена стороны внутри подхода', () => {
    const p = at(
      createPlayer(
        session(
          item('skating-jumps', 'program', {
            sets: 1,
            reps: 5,
            workSec: undefined,
            perSide: true,
            restSec: 30,
          }),
        ),
        0,
      ),
      0,
      { type: 'begin' },
    );
    expect(wk(p)).toEqual({ kind: 'side', seconds: SIDE_SWITCH_SEC });
  });

  it('последний подход блока А — оценка техники', () => {
    const p = at(createPlayer(session(item('spiderman', 'program', { workSec: 10 })), 0), 0, {
      type: 'begin',
    });
    expect(wk(p)).toEqual({ kind: 'rating' });
  });

  it('последний подход не блока А — следующее упражнение; последнее упражнение — конец', () => {
    const two = session(
      item('ladder', 'feet', { workSec: 10, restSec: 30 }),
      item('line-hops', 'feet', { workSec: 10 }),
    );
    const p = at(createPlayer(two, 0), 5_000, { type: 'tick' });
    expect(p.phase).toBe('work');
    const next = wk(p);
    expect(next).toMatchObject({ kind: 'item', restSec: 30 });
    expect((next as { item: SessionItem }).item.exercise.id).toBe('line-hops');
    const last = at(at(p, 15_000, { type: 'tick' }), 50_000, { type: 'tick' });
    expect(last.itemIndex).toBe(1);
    expect(wk(at(last, 55_000, { type: 'tick' }))).toEqual({ kind: 'end' });
  });

  it('следующий подход без отдыха — просто следующий подход (seconds: 0)', () => {
    const p = at(
      createPlayer(session(item('ladder', 'feet', { sets: 2, workSec: 10, restSec: 0 })), 0),
      5_000,
      { type: 'tick' },
    );
    expect(wk(p)).toEqual({ kind: 'rest', seconds: 0 });
  });
});
