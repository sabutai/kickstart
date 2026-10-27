import { z } from 'zod';

// Пользовательские данные (docs/architecture.md → «Модель данных»). Все записи — со SyncMeta.

export const SyncMetaSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().optional(),
});
export type SyncMeta = z.infer<typeof SyncMetaSchema>;

/** День недели по ISO: 1 = понедельник … 7 = воскресенье (неделя с понедельника). */
export const WeekdaySchema = z.int().min(1).max(7);
export type Weekday = z.infer<typeof WeekdaySchema>;

const LangSchema = z.enum(['ru', 'en']);
const DateSchema = z.iso.date(); // yyyy-MM-dd
const LevelSchema = z.int().min(1).max(5);

export const ProfileSchema = SyncMetaSchema.extend({
  name: z.string().trim().min(1).max(40),
  age: z.int().min(4).max(18),
  lang: LangSchema,
  mode: z.enum(['child', 'coach']),
  coachPinHash: z.string().min(1).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ScheduleSchema = SyncMetaSchema.extend({
  startDate: DateSchema,
  clubDays: z.array(WeekdaySchema),
  homeDays: z.array(WeekdaySchema),
  weeks: z.int().min(1).max(52),
}).superRefine((s, ctx) => {
  const unique = (days: number[]) => new Set(days).size === days.length;
  if (!unique(s.clubDays))
    ctx.addIssue({ code: 'custom', path: ['clubDays'], message: 'Дни не повторяются' });
  if (!unique(s.homeDays))
    ctx.addIssue({ code: 'custom', path: ['homeDays'], message: 'Дни не повторяются' });
  if (s.clubDays.some((d) => s.homeDays.includes(d))) {
    ctx.addIssue({ code: 'custom', path: ['homeDays'], message: 'День секции не может быть и домашним' });
  }
  if (s.clubDays.length + s.homeDays.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['homeDays'], message: 'Нужен хотя бы один день занятий' });
  }
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const PlannedSessionSchema = SyncMetaSchema.extend({
  date: DateSchema,
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: z.enum(['home', 'club', 'test']),
  status: z.enum(['planned', 'done', 'skipped']), // для 'club' done = «был на тренировке»
  movedFrom: DateSchema.optional(),
});
export type PlannedSession = z.infer<typeof PlannedSessionSchema>;

export const SessionLogSchema = SyncMetaSchema.extend({
  sessionId: z.string().min(1),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().optional(),
  items: z.array(
    z.object({
      exerciseId: z.string().min(1),
      level: LevelSchema,
      setsDone: z.int().nonnegative(),
      techniqueRating: z.int().min(1).max(5).optional(),
    }),
  ),
});
export type SessionLog = z.infer<typeof SessionLogSchema>;

export const ExerciseProgressSchema = SyncMetaSchema.extend({
  exerciseId: z.string().min(1),
  level: LevelSchema,
  cleanSessionsInRow: z.int().nonnegative(),
});
export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>;

export const MiniTestSchema = SyncMetaSchema.extend({
  date: DateSchema,
  soleTaps30s: z.number().nonnegative().optional(),
  oneLegEyesClosedSec: z.number().nonnegative().optional(),
  snailSec: z.number().nonnegative().optional(),
});
export type MiniTest = z.infer<typeof MiniTestSchema>;
