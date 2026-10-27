import { createEffect, createEvent, createStore, sample } from 'effector';
import { z } from 'zod';
import { preferences } from '../../shared/lib/platform';

// Настройки — небольшой JSON в Preferences (в SQLite только данные пользователя).
// Что уже определяется другими данными, не дублируем: «онбординг пройден» = есть профиль и расписание.
export const SettingsSchema = z.object({
  remindersEnabled: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_KEY = 'settings';
export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export const loadSettingsFx = createEffect(async (): Promise<Settings> => {
  const raw = await preferences.get(SETTINGS_KEY);
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const parsed = SettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS; // повреждённые настройки не должны мешать запуску
  }
});

const saveSettingsFx = createEffect(async (settings: Settings): Promise<Settings> => {
  await preferences.set(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
});

/** Изменить часть настроек. */
export const settingsChanged = createEvent<Partial<Settings>>();

export const $settings = createStore<Settings>(DEFAULT_SETTINGS)
  .on(loadSettingsFx.doneData, (_, settings) => settings)
  .on(saveSettingsFx.doneData, (_, settings) => settings);

sample({
  clock: settingsChanged,
  source: $settings,
  fn: (current, patch) => SettingsSchema.parse({ ...current, ...patch }),
  target: saveSettingsFx,
});
