import { createRepository, type Repository } from '../../shared/lib/db/repository';
import type { Database } from '../../shared/lib/db/types';
import {
  ExerciseProgressSchema,
  MiniTestSchema,
  PlannedSessionSchema,
  ProfileSchema,
  ScheduleSchema,
  SessionLogSchema,
  type ExerciseProgress,
  type MiniTest,
  type PlannedSession,
  type Profile,
  type Schedule,
  type SessionLog,
} from './schema';

export type UserDataRepositories = {
  profiles: Repository<Profile>;
  schedules: Repository<Schedule>;
  plannedSessions: Repository<PlannedSession>;
  sessionLogs: Repository<SessionLog>;
  exerciseProgress: Repository<ExerciseProgress>;
  miniTests: Repository<MiniTest>;
};

/** Репозитории всех пользовательских данных. Ключ выборки — то, по чему нужно искать. */
export function createUserDataRepositories(db: Database, clock?: () => string): UserDataRepositories {
  return {
    profiles: createRepository(db, { table: 'profile', schema: ProfileSchema, clock }),
    schedules: createRepository(db, { table: 'schedule', schema: ScheduleSchema, clock }),
    plannedSessions: createRepository(db, {
      table: 'planned_session',
      schema: PlannedSessionSchema,
      key: (s) => s.date,
      clock,
    }),
    sessionLogs: createRepository(db, {
      table: 'session_log',
      schema: SessionLogSchema,
      key: (l) => l.startedAt.slice(0, 10),
      clock,
    }),
    exerciseProgress: createRepository(db, {
      table: 'exercise_progress',
      schema: ExerciseProgressSchema,
      key: (p) => p.exerciseId,
      clock,
    }),
    miniTests: createRepository(db, {
      table: 'mini_test',
      schema: MiniTestSchema,
      key: (t) => t.date,
      clock,
    }),
  };
}
