import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import { memoryPreferences } from '../../test/store-env';

const mem = vi.hoisted(() => ({ prefs: undefined as ReturnType<typeof memoryPreferences> | undefined }));
vi.mock('../../shared/lib/platform', () => ({
  preferences: {
    get: (k: string) => mem.prefs!.preferences.get(k),
    set: (k: string, v: string) => mem.prefs!.preferences.set(k, v),
    remove: (k: string) => mem.prefs!.preferences.remove(k),
  },
}));

import { $settings, DEFAULT_SETTINGS, SETTINGS_KEY, loadSettingsFx, settingsChanged } from './model';

beforeEach(() => {
  mem.prefs = memoryPreferences();
});

describe('стор настроек', () => {
  it('без сохранённых настроек — значения по умолчанию, напоминания выключены', async () => {
    const scope = fork();
    await allSettled(loadSettingsFx, { scope });
    expect(scope.getState($settings)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.remindersEnabled).toBe(false);
  });

  it('settingsChanged сохраняет в Preferences и переживает перезапуск', async () => {
    const scope = fork();
    await allSettled(settingsChanged, { scope, params: { remindersEnabled: true } });
    expect(scope.getState($settings).remindersEnabled).toBe(true);
    expect(JSON.parse(mem.prefs!.data.get(SETTINGS_KEY)!)).toEqual({ remindersEnabled: true });

    const fresh = fork();
    await allSettled(loadSettingsFx, { scope: fresh });
    expect(fresh.getState($settings).remindersEnabled).toBe(true);
  });

  it('повреждённые настройки не ломают запуск — берутся значения по умолчанию', async () => {
    mem.prefs!.data.set(SETTINGS_KEY, '{не json');
    const scope = fork();
    await allSettled(loadSettingsFx, { scope });
    expect(scope.getState($settings)).toEqual(DEFAULT_SETTINGS);

    mem.prefs!.data.set(SETTINGS_KEY, JSON.stringify({ remindersEnabled: 'да' }));
    const other = fork();
    await allSettled(loadSettingsFx, { scope: other });
    expect(other.getState($settings)).toEqual(DEFAULT_SETTINGS);
  });

  it('лишние ключи из будущих версий отбрасываются', async () => {
    mem.prefs!.data.set(SETTINGS_KEY, JSON.stringify({ remindersEnabled: true, newThing: 1 }));
    const scope = fork();
    await allSettled(loadSettingsFx, { scope });
    expect(scope.getState($settings)).toEqual({ remindersEnabled: true });
  });
});
