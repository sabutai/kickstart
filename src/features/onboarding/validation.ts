import { addDays } from 'date-fns';
import { toDate, toKey } from '../../shared/lib/dates';

export const NAME_MAX = 40;
export const AGE_MIN = 7;
export const AGE_MAX = 13;
export const DEFAULT_AGE = 8;
/** Дни дома по умолчанию (макет: Вт, Чт, Сб) — их получает «Пропустить» на шаге 2. */
export const DEFAULT_HOME_DAYS = [2, 4, 6];
export const STEPS = 4;

export type Draft = {
  name: string;
  age: number;
  clubDays: number[];
  homeDays: number[];
  startDate: string; // yyyy-MM-dd
  remindersEnabled: boolean;
  pin: string | null;
};

export type Step = 1 | 2 | 3 | 4;

export const isNameValid = (name: string): boolean =>
  name.trim().length >= 1 && name.trim().length <= NAME_MAX;

export type StartPreset = 'today' | 'tomorrow' | 'week';

export function presetDate(preset: StartPreset, today: string): string {
  const offset = { today: 0, tomorrow: 1, week: 7 }[preset];
  return toKey(addDays(toDate(today), offset));
}

/** Можно ли перейти дальше с шага. Шаг 4 всегда готов: PIN необязателен. */
export function canProceed(step: Step, draft: Draft, today: string): boolean {
  switch (step) {
    case 1:
      return isNameValid(draft.name) && draft.age >= AGE_MIN && draft.age <= AGE_MAX;
    case 2:
      // Программа домашняя: нужен хотя бы один домашний день.
      return draft.homeDays.length > 0;
    case 3:
      return draft.startDate >= today;
    case 4:
      return true;
  }
}
