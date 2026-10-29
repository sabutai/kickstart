import type { Exercise, ExerciseLevel, Program, SessionPartKind } from '../../content/schema';
import { clampLevel, maxHomeLevel } from '../../content/selectors';

/** Объём упражнения в занятии: время уже выбрано из диапазона. */
export type SessionVolume = {
  sets: number;
  reps?: number;
  workSec?: number;
  /** Каждый подход делается на обе стороны (reps/workSec — на одну). */
  perSide: boolean;
  restSec: number;
};

export type SessionItem = {
  exercise: Exercise;
  level: number;
  partKind: SessionPartKind;
  volume: SessionVolume;
};

export type BuiltSession = {
  /** Части в порядке шаблона занятия (только непустые). */
  parts: SessionPartKind[];
  /** Все упражнения занятия подряд, каждое помечено своей частью. */
  items: SessionItem[];
};

type Input = {
  program: Program;
  /** Неделя программы (с 1). */
  week: number;
  /** Номер занятия по порядку: от него зависит, какие равноценные упражнения выбрать. Детерминированно. */
  rotation: number;
  /** Текущий уровень ребёнка в упражнении. */
  levelOf: (exerciseId: string) => number;
};

/** Сколько упражнений брать в частях, где выбор неоднозначен (укладывается в минуты шаблона). */
const BALL_COUNT = 4;
const FEET_COUNT = 2;
/** С этой недели берём верхнюю границу диапазона времени работы (до неё — нижнюю). */
const UPPER_RANGE_FROM_WEEK = 5;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** `count` подряд идущих элементов по кругу, начиная со смещения; без повторов. */
function rotate<T>(pool: T[], count: number, offset: number): T[] {
  const n = Math.min(count, pool.length);
  if (n === 0) return [];
  const start = mod(offset, pool.length);
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]!);
}

function volumeFor(level: ExerciseLevel, week: number): SessionVolume {
  const v = level.volume;
  const useUpper = week >= UPPER_RANGE_FROM_WEEK && v.workSecMax !== undefined;
  return {
    sets: v.sets,
    reps: v.reps,
    workSec: useUpper ? v.workSecMax : v.workSec,
    perSide: v.perSide ?? false,
    restSec: v.restSec,
  };
}

/**
 * Занятие из шаблона: 5 частей, выбор упражнений и уровней (docs/program.md, «Структура занятия»
 * и «12 недель: этапы»). Чистая функция: одинаковый ввод даёт одинаковое занятие.
 */
export function buildSession({ program, week, rotation, levelOf }: Input): BuiltSession {
  const currentWeek = Math.max(1, Math.round(week));
  const available = (e: Exercise) => (e.fromWeek ?? 1) <= currentWeek;
  const inPart = (kind: SessionPartKind) =>
    program.exercises.filter((e) => e.partKinds.includes(kind) && available(e));

  const item = (exercise: Exercise, partKind: SessionPartKind, level: number): SessionItem => {
    const clamped = clampLevel(exercise, level);
    return {
      exercise,
      level: clamped,
      partKind,
      volume: volumeFor(exercise.levels[clamped - 1]!, currentWeek),
    };
  };

  const items: SessionItem[] = [];
  const parts: SessionPartKind[] = [];

  for (const { kind } of program.session.parts) {
    let chosen: SessionItem[] = [];
    switch (kind) {
      case 'game':
        chosen = rotate(inPart('game'), 1, rotation).map((e) => item(e, kind, 1));
        break;
      case 'program':
        chosen = inPart('program').map((e) => item(e, kind, Math.min(levelOf(e.id), maxHomeLevel(e))));
        break;
      case 'ball':
        chosen = rotate(inPart('ball'), BALL_COUNT, rotation).map((e) => item(e, kind, 1));
        break;
      case 'feet':
        chosen = rotate(inPart('feet'), FEET_COUNT, rotation).map((e) => item(e, kind, 1));
        break;
      case 'cooldown': {
        const pool = inPart('cooldown');
        const finalGame = rotate(
          pool.filter((e) => e.category === 'games'),
          1,
          rotation,
        );
        const mobility = pool.filter((e) => e.category === 'mobility');
        chosen = [...finalGame, ...mobility].map((e) => item(e, kind, 1));
        break;
      }
    }
    if (chosen.length > 0) {
      parts.push(kind);
      items.push(...chosen);
    }
  }
  return { parts, items };
}
