import { describe, expect, it } from 'vitest';
import {
  ExerciseProgressSchema,
  MiniTestSchema,
  PlannedSessionSchema,
  ProfileSchema,
  ScheduleSchema,
  SessionLogSchema,
} from './schema';

const meta = { id: 'x1', updatedAt: '2026-11-02T10:00:00.000Z' };

describe('Profile', () => {
  const profile = { ...meta, name: 'Тимур', age: 8, lang: 'ru', mode: 'child' };

  it('принимает профиль, PIN необязателен', () => {
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...profile, coachPinHash: 'abc' }).success).toBe(true);
  });

  it('отклоняет пустое имя, странный возраст и режим', () => {
    expect(ProfileSchema.safeParse({ ...profile, name: '' }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, name: '   ' }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, age: 2 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, age: 8.5 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, mode: 'parent' }).success).toBe(false);
  });
});

describe('SyncMeta', () => {
  it('updatedAt — ISO-дата-время, deletedAt необязателен', () => {
    const base = { name: 'Т', age: 8, lang: 'ru', mode: 'child' };
    expect(ProfileSchema.safeParse({ ...base, id: 'a', updatedAt: 'вчера' }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...base, id: '', updatedAt: meta.updatedAt }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...base, ...meta, deletedAt: meta.updatedAt }).success).toBe(true);
  });
});

describe('Schedule', () => {
  const schedule = { ...meta, startDate: '2026-11-02', clubDays: [2, 4], homeDays: [1, 3, 6], weeks: 12 };

  it('принимает расписание', () => {
    expect(ScheduleSchema.safeParse(schedule).success).toBe(true);
  });

  it('дни — ISO 1–7 без повторов, секция и дом не пересекаются', () => {
    expect(ScheduleSchema.safeParse({ ...schedule, clubDays: [0] }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, homeDays: [8] }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, homeDays: [1, 1] }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, homeDays: [2, 3] }).success).toBe(false);
  });

  it('нужен хотя бы один день занятий', () => {
    expect(ScheduleSchema.safeParse({ ...schedule, clubDays: [], homeDays: [] }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, clubDays: [], homeDays: [1] }).success).toBe(true);
  });

  it('дата — yyyy-MM-dd, недель 1–52', () => {
    expect(ScheduleSchema.safeParse({ ...schedule, startDate: '02.11.2026' }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, startDate: '2026-02-30' }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, weeks: 0 }).success).toBe(false);
    expect(ScheduleSchema.safeParse({ ...schedule, weeks: 53 }).success).toBe(false);
  });
});

describe('PlannedSession', () => {
  const session = { ...meta, date: '2026-11-03', stage: 1, kind: 'home', status: 'planned' };

  it('принимает занятие и перенос', () => {
    expect(PlannedSessionSchema.safeParse(session).success).toBe(true);
    expect(PlannedSessionSchema.safeParse({ ...session, movedFrom: '2026-11-07' }).success).toBe(true);
  });

  it('отклоняет этап 4, неизвестные вид и статус', () => {
    expect(PlannedSessionSchema.safeParse({ ...session, stage: 4 }).success).toBe(false);
    expect(PlannedSessionSchema.safeParse({ ...session, kind: 'gym' }).success).toBe(false);
    expect(PlannedSessionSchema.safeParse({ ...session, status: 'moved' }).success).toBe(false);
  });
});

describe('SessionLog', () => {
  const log = {
    ...meta,
    sessionId: 's1',
    startedAt: '2026-11-03T16:00:00.000Z',
    items: [{ exerciseId: 'skating-jumps', level: 1, setsDone: 2, techniqueRating: 4 }],
  };

  it('принимает журнал; finishedAt и оценка необязательны', () => {
    expect(SessionLogSchema.safeParse(log).success).toBe(true);
    expect(
      SessionLogSchema.safeParse({
        ...log,
        finishedAt: '2026-11-03T16:35:00.000Z',
        items: [{ exerciseId: 'spiderman', level: 2, setsDone: 3 }],
      }).success,
    ).toBe(true);
  });

  it('оценка техники 1–5, уровень 1–5, подходов не меньше 0', () => {
    const item = log.items[0]!;
    for (const bad of [{ techniqueRating: 6 }, { techniqueRating: 0 }, { level: 6 }, { setsDone: -1 }]) {
      expect(SessionLogSchema.safeParse({ ...log, items: [{ ...item, ...bad }] }).success).toBe(false);
    }
  });
});

describe('ExerciseProgress и MiniTest', () => {
  it('ExerciseProgress: уровень 1–5, серия чистых занятий ≥ 0', () => {
    const p = { ...meta, exerciseId: 'skating-jumps', level: 2, cleanSessionsInRow: 1 };
    expect(ExerciseProgressSchema.safeParse(p).success).toBe(true);
    expect(ExerciseProgressSchema.safeParse({ ...p, level: 0 }).success).toBe(false);
    expect(ExerciseProgressSchema.safeParse({ ...p, cleanSessionsInRow: -1 }).success).toBe(false);
  });

  it('MiniTest: все метрики необязательны, но неотрицательны', () => {
    const t = { ...meta, date: '2026-11-02' };
    expect(MiniTestSchema.safeParse(t).success).toBe(true);
    expect(
      MiniTestSchema.safeParse({ ...t, soleTaps30s: 40, oneLegEyesClosedSec: 7, snailSec: 21.5 }).success,
    ).toBe(true);
    expect(MiniTestSchema.safeParse({ ...t, soleTaps30s: -1 }).success).toBe(false);
  });
});
