import { program } from '../../content';
import { weekOfDate } from '../schedule/calendar';
import type { PlannedSession, Schedule } from '../user-data/schema';
import { buildSession } from './build';
import { createPlayer, type PlayerState } from './player';

type Input = {
  plan: PlannedSession[];
  schedule: Pick<Schedule, 'startDate'> | null;
  levelOf: (exerciseId: string) => number;
  today: string; // yyyy-MM-dd
  now: number; // Date.now()
};

/**
 * Запуск занятия на сегодня: берётся сегодняшнее запланированное домашнее занятие (или мини-тест —
 * пока обычным занятием, сами мини-тесты — этап 6). Нет такого — null. Занятие секции не запускается.
 */
export function startPlayer({
  plan,
  schedule,
  levelOf,
  today,
  now,
}: Input): { planId: string; player: PlayerState } | null {
  const planned = plan.find((s) => s.date === today && s.status === 'planned' && s.kind !== 'club');
  if (!planned) return null;
  const week = schedule ? weekOfDate(schedule.startDate, today) : 1;
  // Ротация — по числу прошедших домашних занятий: равноценные упражнения чередуются, результат детерминирован.
  const rotation = plan.filter((s) => s.kind !== 'club' && s.date < today).length;
  const built = buildSession({ program, week, rotation, levelOf });
  return { planId: planned.id, player: createPlayer(built, now) };
}
