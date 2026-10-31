import { createEffect, createEvent, createStore, sample } from 'effector';
import { saveProfileFx } from '../../entities/profile/model';
import { PROGRAM_WEEKS, generateCalendar } from '../../entities/schedule/calendar';
import { replacePlannedSessionsFx, saveScheduleFx } from '../../entities/schedule/model';
import { saveSettingsFx } from '../../entities/settings/model';
import { toKey } from '../../shared/lib/dates';
import { hashPin } from '../../shared/lib/pin';
import { DEFAULT_AGE, DEFAULT_HOME_DAYS, type Draft } from './validation';

const initialDraft = (): Draft => ({
  name: '',
  age: DEFAULT_AGE,
  clubDays: [],
  homeDays: [...DEFAULT_HOME_DAYS],
  startDate: toKey(new Date()),
  remindersEnabled: true, // как в макете; само разрешение на уведомления запрашивается на этапе 7
  pin: null,
});

export const nameChanged = createEvent<string>();
export const ageChanged = createEvent<number>();
export const dayToggled = createEvent<{ group: 'club' | 'home'; day: number }>();
export const startDateChanged = createEvent<string>();
export const remindersChanged = createEvent<boolean>();
/** Выбранный PIN (null — «настроить позже»). */
export const pinChosen = createEvent<string | null>();
export const onboardingFinished = createEvent();
export const draftReset = createEvent();

const toggle = (days: number[], day: number): number[] =>
  days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);

export const $draft = createStore<Draft>(initialDraft())
  .on(nameChanged, (d, name) => ({ ...d, name }))
  .on(ageChanged, (d, age) => ({ ...d, age }))
  .on(dayToggled, (d, { group, day }) => {
    const other = group === 'club' ? d.homeDays : d.clubDays;
    if (other.includes(day)) return d; // день уже занят другой группой
    return group === 'club'
      ? { ...d, clubDays: toggle(d.clubDays, day) }
      : { ...d, homeDays: toggle(d.homeDays, day) };
  })
  .on(startDateChanged, (d, startDate) => ({ ...d, startDate }))
  .on(remindersChanged, (d, remindersEnabled) => ({ ...d, remindersEnabled }))
  .on(pinChosen, (d, pin) => ({ ...d, pin }))
  .reset(draftReset);

/**
 * Запись результата онбординга. Порядок важен: расписание пишется ПОСЛЕДНИМ — по нему приложение
 * считает онбординг пройденным (`$onboardingDone`). Сбой на полпути оставляет онбординг незавершённым,
 * а повтор безопасен: id занятий детерминированные, лишние занятия прошлой попытки стираются.
 */
// Хеширование — отдельный эффект: после `await` обычного промиса Effector теряет scope,
// а `await` эффекта его сохраняет.
const hashPinFx = createEffect(hashPin);

export const finishOnboardingFx = createEffect(async (draft: Draft) => {
  const today = toKey(new Date());
  const startDate = draft.startDate < today ? today : draft.startDate;
  const coachPinHash = draft.pin ? await hashPinFx(draft.pin) : undefined;

  await saveProfileFx({
    name: draft.name.trim(),
    age: draft.age,
    lang: 'ru',
    mode: 'child',
    ...(coachPinHash ? { coachPinHash } : {}),
  });
  const schedule = { startDate, clubDays: draft.clubDays, homeDays: draft.homeDays, weeks: PROGRAM_WEEKS };
  await replacePlannedSessionsFx(generateCalendar(schedule));
  await saveSettingsFx({ remindersEnabled: draft.remindersEnabled });
  await saveScheduleFx(schedule);
});

sample({ clock: onboardingFinished, source: $draft, target: finishOnboardingFx });

export const $finishing = finishOnboardingFx.pending;

/** Текст ошибки последней попытки завершить онбординг (null — нет ошибки). */
export const $finishError = createStore<string | null>(null)
  .on(finishOnboardingFx.failData, (_, e) => (e instanceof Error ? e.message : String(e)))
  .reset(onboardingFinished);

// После успеха черновик (в том числе PIN) из памяти убираем.
sample({ clock: finishOnboardingFx.done, target: draftReset });
