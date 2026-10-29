import type { TFunction } from 'i18next';
import type { Exercise, ExerciseLevel } from './schema';
import { clampLevel } from './selectors';

export type StatItem = { value: string; label: string };

/** «15 с», «30–45 с»; кратное минуте — минутами: «3–4 мин». */
export function formatDuration(t: TFunction, sec: number, secMax?: number): string {
  const max = secMax !== undefined && secMax !== sec ? secMax : undefined;
  const wholeMinutes = sec >= 60 && sec % 60 === 0 && (max === undefined || max % 60 === 0);
  const unit = (v: number) => (wholeMinutes ? v / 60 : v);
  const value = max === undefined ? String(unit(sec)) : `${unit(sec)}–${unit(max)}`;
  return t(wholeMinutes ? 'library.minutesRange' : 'library.seconds', { value });
}

/** Показатели объёма для экрана упражнения: подходы, повторы или время, отдых. */
export function volumeStats(t: TFunction, volume: ExerciseLevel['volume']): StatItem[] {
  const stats: StatItem[] = [
    { value: String(volume.sets), label: t('exercise.stats.sets', { count: volume.sets }) },
  ];
  if (volume.reps !== undefined) {
    stats.push({
      value: volume.perSide ? t('exercise.stats.repsPerSide', { count: volume.reps }) : String(volume.reps),
      label: t('exercise.stats.reps'),
    });
  } else if (volume.workSec !== undefined) {
    stats.push({
      value: formatDuration(t, volume.workSec, volume.workSecMax),
      label: t('exercise.stats.time'),
    });
  }
  if (volume.restSec > 0)
    stats.push({ value: formatDuration(t, volume.restSec), label: t('exercise.stats.rest') });
  return stats;
}

/** Значок в углу превью: время работы или число подходов («30–45 с», «2 подхода»). */
export function cardBadge(t: TFunction, exercise: Exercise, level: number): string {
  const volume = exercise.levels[clampLevel(exercise, level) - 1]!.volume;
  return exercise.levels.length === 1 && volume.workSec !== undefined
    ? formatDuration(t, volume.workSec, volume.workSecMax)
    : t('library.sets', { count: volume.sets });
}

/** Текст рядом с пипсами: «Ур. 2»; у упражнений с одним уровнем — «с 5-й недели», если они открываются позже. */
export function cardLevelText(t: TFunction, exercise: Exercise, level: number): string | undefined {
  if (exercise.levels.length > 1) return t('ui.levelShort', { level: clampLevel(exercise, level) });
  return exercise.fromWeek ? t('library.fromWeek', { week: exercise.fromWeek }) : undefined;
}
