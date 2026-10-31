import type { TFunction } from 'i18next';
import type { Exercise, ExerciseLevel } from './schema';
import { clampLevel } from './selectors';

/** «15 сек», «30–45 сек»; кратное минуте — минутами: «3–4 мин». */
export function formatDuration(t: TFunction, sec: number, secMax?: number): string {
  const max = secMax !== undefined && secMax !== sec ? secMax : undefined;
  const wholeMinutes = sec >= 60 && sec % 60 === 0 && (max === undefined || max % 60 === 0);
  const unit = (v: number) => (wholeMinutes ? v / 60 : v);
  const value = max === undefined ? String(unit(sec)) : `${unit(sec)}–${unit(max)}`;
  return t(wholeMinutes ? 'library.minutesRange' : 'library.seconds', { value });
}

/** Объём одной строкой, как в макете: «3 подхода по 20 сек · отдых 20 сек». */
export function volumeLine(t: TFunction, volume: ExerciseLevel['volume']): string {
  const sets = t('library.sets', { count: volume.sets });
  let work = '';
  if (volume.reps !== undefined) {
    work = t('exercise.volume.reps', { count: volume.reps });
    if (volume.perSide) work += ` ${t('exercise.volume.perSide')}`;
  } else if (volume.workSec !== undefined) {
    work = formatDuration(t, volume.workSec, volume.workSecMax);
    if (volume.perSide) work += ` ${t('exercise.volume.perSide')}`;
  }
  const main = work ? `${sets} ${t('exercise.volume.by')} ${work}` : sets;
  return volume.restSec > 0
    ? `${main} · ${t('exercise.volume.rest', { value: formatDuration(t, volume.restSec) })}`
    : main;
}

/** Значок карточки в списке: время работы (упражнения с одним уровнем) или число подходов. */
export function cardDetail(t: TFunction, exercise: Exercise, level: number): string {
  const volume = exercise.levels[clampLevel(exercise, level) - 1]!.volume;
  const base =
    exercise.levels.length === 1 && volume.workSec !== undefined
      ? formatDuration(t, volume.workSec, volume.workSecMax)
      : t('library.sets', { count: volume.sets });
  return exercise.fromWeek ? `${base} · ${t('library.fromWeek', { week: exercise.fromWeek })}` : base;
}
