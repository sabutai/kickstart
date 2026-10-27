import { z } from 'zod';

// Контент программы: статический JSON внутри сборки, проверяется при старте (docs/architecture.md).
// Тексты — в docs/program.md; методику не придумываем.

const Localized = z.object({
  ru: z.string().min(1),
  en: z.string().min(1).optional(), // английский — 1.1+
});

const LocalizedList = z.object({
  ru: z.array(z.string().min(1)).min(1),
  en: z.array(z.string().min(1)).min(1).optional(),
});

export const CategorySchema = z.enum(['warmup', 'balance', 'strength', 'technique', 'games', 'mobility']);
export type Category = z.infer<typeof CategorySchema>;

export const SessionPartKindSchema = z.enum(['game', 'program', 'ball', 'feet', 'cooldown']);
export type SessionPartKind = z.infer<typeof SessionPartKindSchema>;

const positiveInt = z.int().positive();

const VolumeSchema = z
  .object({
    sets: positiveInt,
    reps: positiveInt.optional(), // на повторы — фаза work по кнопке «Готово»
    perSide: z.boolean().optional(),
    workSec: positiveInt.optional(), // на время; нижняя граница диапазона
    workSecMax: positiveInt.optional(), // верхняя граница, если в методике дан диапазон
    restSec: z.int().nonnegative(),
  })
  .refine((v) => v.reps !== undefined || v.workSec !== undefined, {
    message: 'Нужны повторы (reps) или время работы (workSec)',
  })
  .refine((v) => v.workSecMax === undefined || (v.workSec !== undefined && v.workSecMax >= v.workSec), {
    message: 'workSecMax не может быть меньше workSec',
  });

const DemoSchema = z.object({
  kind: z.enum(['video', 'image']),
  src: z.string().min(1),
  poster: z.string().min(1),
});

export const ExerciseLevelSchema = z.object({
  level: z.int().min(1).max(5),
  /** Что меняется на этом уровне (или всё описание, если общих шагов нет). */
  variation: Localized,
  volume: VolumeSchema,
  demo: DemoSchema,
});
export type ExerciseLevel = z.infer<typeof ExerciseLevelSchema>;

export const ExerciseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id — kebab-case'),
    category: CategorySchema,
    /** В каких частях занятия упражнение может встретиться. */
    partKinds: z.array(SessionPartKindSchema).min(1),
    title: Localized,
    why: Localized,
    setup: Localized.optional(), // исходное положение
    steps: LocalizedList.optional(), // общее выполнение для всех уровней
    mistakes: LocalizedList.optional(), // ошибки — для взрослого
    cue: Localized.optional(), // команда ребёнку
    fromWeek: z.int().min(1).max(12).optional(), // с какой недели программы
    levels: z.array(ExerciseLevelSchema).min(1).max(5),
    safety: z
      .object({
        homeMaxLevel: z.int().min(1).max(5).optional(),
        needsMat: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((ex, ctx) => {
    ex.levels.forEach((lvl, i) => {
      if (lvl.level !== i + 1) {
        ctx.addIssue({ code: 'custom', path: ['levels', i, 'level'], message: 'Уровни идут подряд с 1' });
      }
      const base = `${ex.id}_l${lvl.level}`;
      const wantSrc = lvl.demo.kind === 'video' ? '.mp4' : '.webp';
      if (!lvl.demo.src.endsWith(`${base}${wantSrc}`)) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'demo', 'src'],
          message: `Ожидается …${base}${wantSrc}`,
        });
      }
      if (!lvl.demo.poster.endsWith(`${base}.webp`)) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'demo', 'poster'],
          message: `Ожидается …${base}.webp`,
        });
      }
    });
    const home = ex.safety?.homeMaxLevel;
    if (home !== undefined && home > ex.levels.length) {
      ctx.addIssue({ code: 'custom', path: ['safety', 'homeMaxLevel'], message: 'Больше числа уровней' });
    }
  });
export type Exercise = z.infer<typeof ExerciseSchema>;

export const SessionTemplateSchema = z.object({
  parts: z.array(z.object({ kind: SessionPartKindSchema, minutes: positiveInt })).min(1),
});
export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;

export const ProgramSchema = z
  .object({
    exercises: z.array(ExerciseSchema).min(1),
    session: SessionTemplateSchema,
  })
  .superRefine((program, ctx) => {
    const seen = new Set<string>();
    program.exercises.forEach((ex, i) => {
      if (seen.has(ex.id)) {
        ctx.addIssue({ code: 'custom', path: ['exercises', i, 'id'], message: `Повторяется id ${ex.id}` });
      }
      seen.add(ex.id);
    });
  });
export type Program = z.infer<typeof ProgramSchema>;
