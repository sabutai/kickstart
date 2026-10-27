import { describe, expect, it } from 'vitest';
import { ExerciseSchema, SessionTemplateSchema, ProgramSchema } from './schema';

const level = (n: number, over: Record<string, unknown> = {}) => ({
  level: n,
  variation: { ru: `Уровень ${n}` },
  volume: { sets: 2, reps: 10, restSec: 20 },
  demo: {
    kind: n <= 2 ? 'video' : 'image',
    src: `content/skating-jumps_l${n}.${n <= 2 ? 'mp4' : 'webp'}`,
    poster: `content/skating-jumps_l${n}.webp`,
  },
  ...over,
});

const exercise = (over: Record<string, unknown> = {}) => ({
  id: 'skating-jumps',
  category: 'balance',
  partKinds: ['program'],
  title: { ru: 'Прыжки конькобежца' },
  why: { ru: 'Укрепляет голеностоп' },
  levels: [1, 2, 3, 4, 5].map((n) => level(n)),
  ...over,
});

describe('ExerciseSchema', () => {
  it('принимает упражнение с 5 уровнями', () => {
    expect(ExerciseSchema.safeParse(exercise()).success).toBe(true);
  });

  it('принимает необязательные поля: шаги, ошибки, команду, безопасность, fromWeek', () => {
    const r = ExerciseSchema.safeParse(
      exercise({
        setup: { ru: 'Стоя на левой ноге' },
        steps: { ru: ['Оттолкнуться', 'Приземлиться'] },
        mistakes: { ru: ['Колено внутрь'] },
        cue: { ru: 'Прыгай далеко' },
        safety: { homeMaxLevel: 3, needsMat: true },
        fromWeek: 5,
      }),
    );
    expect(r.success).toBe(true);
  });

  it('why и lookFor необязательны (в блоках Б–Г «Зачем» нет)', () => {
    const { why: _why, ...withoutWhy } = exercise();
    expect(ExerciseSchema.safeParse(withoutWhy).success).toBe(true);
    expect(ExerciseSchema.safeParse(exercise({ lookFor: { ru: 'Колени пружинят' } })).success).toBe(true);
    expect(ExerciseSchema.safeParse(exercise({ lookFor: { ru: '' } })).success).toBe(false);
  });

  it('en необязателен, но не может быть пустым', () => {
    expect(ExerciseSchema.safeParse(exercise({ title: { ru: 'А', en: 'A' } })).success).toBe(true);
    expect(ExerciseSchema.safeParse(exercise({ title: { ru: 'А', en: '' } })).success).toBe(false);
  });

  it('ru обязателен', () => {
    expect(ExerciseSchema.safeParse(exercise({ title: { en: 'A' } })).success).toBe(false);
    expect(ExerciseSchema.safeParse(exercise({ title: { ru: '' } })).success).toBe(false);
  });

  it('отклоняет неизвестную категорию и некорректный id', () => {
    expect(ExerciseSchema.safeParse(exercise({ category: 'cardio' })).success).toBe(false);
    expect(ExerciseSchema.safeParse(exercise({ id: 'Skating Jumps' })).success).toBe(false);
  });

  it('уровни должны идти подряд с 1', () => {
    const skip = [1, 2, 4].map((n) => level(n));
    expect(ExerciseSchema.safeParse(exercise({ levels: skip })).success).toBe(false);
    const fromTwo = [2, 3].map((n) => level(n));
    expect(ExerciseSchema.safeParse(exercise({ levels: fromTwo })).success).toBe(false);
  });

  it('не больше 5 уровней и не меньше 1', () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => level(n));
    expect(ExerciseSchema.safeParse(exercise({ levels: six })).success).toBe(false);
    expect(ExerciseSchema.safeParse(exercise({ levels: [] })).success).toBe(false);
  });

  it('homeMaxLevel не больше числа уровней', () => {
    expect(ExerciseSchema.safeParse(exercise({ safety: { homeMaxLevel: 6 } })).success).toBe(false);
    expect(ExerciseSchema.safeParse(exercise({ safety: { homeMaxLevel: 0 } })).success).toBe(false);
  });

  it('fromWeek в пределах 1–12', () => {
    expect(ExerciseSchema.safeParse(exercise({ fromWeek: 0 })).success).toBe(false);
    expect(ExerciseSchema.safeParse(exercise({ fromWeek: 13 })).success).toBe(false);
  });

  it('partKinds не пустой', () => {
    expect(ExerciseSchema.safeParse(exercise({ partKinds: [] })).success).toBe(false);
  });

  describe('объём', () => {
    it('нужны повторы или время работы', () => {
      const none = level(1, { volume: { sets: 2, restSec: 20 } });
      expect(ExerciseSchema.safeParse(exercise({ levels: [none] })).success).toBe(false);
      const timed = level(1, { volume: { sets: 3, workSec: 15, restSec: 20 } });
      expect(ExerciseSchema.safeParse(exercise({ levels: [timed] })).success).toBe(true);
    });

    it('отклоняет нулевые и дробные значения', () => {
      for (const volume of [
        { sets: 0, reps: 5, restSec: 20 },
        { sets: 2, reps: 2.5, restSec: 20 },
        { sets: 2, reps: 5, restSec: -1 },
      ]) {
        expect(ExerciseSchema.safeParse(exercise({ levels: [level(1, { volume })] })).success).toBe(false);
      }
    });

    it('workSecMax не меньше workSec', () => {
      const bad = level(1, { volume: { sets: 1, workSec: 45, workSecMax: 30, restSec: 20 } });
      expect(ExerciseSchema.safeParse(exercise({ levels: [bad] })).success).toBe(false);
      const ok = level(1, { volume: { sets: 1, workSec: 30, workSecMax: 45, restSec: 20 } });
      expect(ExerciseSchema.safeParse(exercise({ levels: [ok] })).success).toBe(true);
    });
  });

  describe('демо', () => {
    it('имя видео и превью — {id}_l{level}', () => {
      const wrong = level(1, {
        demo: { kind: 'video', src: 'content/other_l1.mp4', poster: 'content/skating-jumps_l1.webp' },
      });
      expect(ExerciseSchema.safeParse(exercise({ levels: [wrong] })).success).toBe(false);
    });

    it('видео — .mp4, картинка — .webp, превью — .webp', () => {
      const badVideo = level(1, {
        demo: {
          kind: 'video',
          src: 'content/skating-jumps_l1.webp',
          poster: 'content/skating-jumps_l1.webp',
        },
      });
      expect(ExerciseSchema.safeParse(exercise({ levels: [badVideo] })).success).toBe(false);
      const badImage = level(1, {
        demo: { kind: 'image', src: 'content/skating-jumps_l1.mp4', poster: 'content/skating-jumps_l1.webp' },
      });
      expect(ExerciseSchema.safeParse(exercise({ levels: [badImage] })).success).toBe(false);
      const badPoster = level(1, {
        demo: { kind: 'video', src: 'content/skating-jumps_l1.mp4', poster: 'content/skating-jumps_l1.png' },
      });
      expect(ExerciseSchema.safeParse(exercise({ levels: [badPoster] })).success).toBe(false);
    });
  });
});

describe('SessionTemplateSchema', () => {
  const part = (kind: string, minutes = 5) => ({ kind, minutes });

  it('принимает 5 частей занятия', () => {
    const parts = ['game', 'program', 'ball', 'feet', 'cooldown'].map((k) => part(k));
    expect(SessionTemplateSchema.safeParse({ parts }).success).toBe(true);
  });

  it('отклоняет неизвестный вид, пустой список и неположительные минуты', () => {
    expect(SessionTemplateSchema.safeParse({ parts: [part('yoga')] }).success).toBe(false);
    expect(SessionTemplateSchema.safeParse({ parts: [] }).success).toBe(false);
    expect(SessionTemplateSchema.safeParse({ parts: [part('game', 0)] }).success).toBe(false);
  });
});

describe('ProgramSchema', () => {
  const template = { parts: [{ kind: 'program', minutes: 15 }] };

  it('принимает набор упражнений и шаблон', () => {
    expect(ProgramSchema.safeParse({ exercises: [exercise()], session: template }).success).toBe(true);
  });

  it('отклоняет повторяющиеся id', () => {
    expect(ProgramSchema.safeParse({ exercises: [exercise(), exercise()], session: template }).success).toBe(
      false,
    );
  });
});
