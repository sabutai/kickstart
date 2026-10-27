import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { $hasProfile, loadProfileFx } from '../entities/profile/model';
import { loadProgressFx } from '../entities/progress/model';
import { $schedule, loadPlannedSessionsFx, loadScheduleFx } from '../entities/schedule/model';
import { loadSettingsFx } from '../entities/settings/model';

/** Запуск приложения: загрузить всё сохранённое в сторы. */
export const appStarted = createEvent();

const bootstrapFx = createEffect(async () => {
  await Promise.all([
    loadProfileFx(),
    loadScheduleFx(),
    loadPlannedSessionsFx(),
    loadProgressFx(),
    loadSettingsFx(),
  ]);
});

sample({ clock: appStarted, target: bootstrapFx });

export const $appReady = createStore(false).on(bootstrapFx.done, () => true);

/** Текст ошибки загрузки (БД/хранилище недоступны) или null. */
export const $appError = createStore<string | null>(null)
  .on(bootstrapFx.failData, (_, error) => (error instanceof Error ? error.message : String(error)))
  .reset(appStarted);

/** Онбординг пройден: есть профиль и расписание. */
export const $onboardingDone = combine(
  $hasProfile,
  $schedule,
  (hasProfile, schedule) => hasProfile && schedule !== null,
);
