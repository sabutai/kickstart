import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import type { Database } from '../shared/lib/db/types';
import { freshDb, memoryPreferences } from '../test/store-env';

const env = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  prefs: undefined as ReturnType<typeof memoryPreferences> | undefined,
  fail: false,
}));
vi.mock('../shared/lib/db/open', () => ({
  getDb: async () => {
    if (env.fail) throw new Error('БД недоступна');
    return env.db!;
  },
}));
vi.mock('../shared/lib/platform', () => ({
  preferences: {
    get: (k: string) => env.prefs!.preferences.get(k),
    set: (k: string, v: string) => env.prefs!.preferences.set(k, v),
    remove: (k: string) => env.prefs!.preferences.remove(k),
  },
}));

import { $hasProfile, $profile, profileSaved } from '../entities/profile/model';
import { $schedule, scheduleSaved } from '../entities/schedule/model';
import { $exerciseLevels, exerciseProgressSaved } from '../entities/progress/model';
import { $settings, settingsChanged } from '../entities/settings/model';
import { $appError, $appReady, $onboardingDone, appStarted } from './model';

beforeEach(async () => {
  env.db = await freshDb();
  env.prefs = memoryPreferences();
  env.fail = false;
});

describe('запуск приложения', () => {
  it('до старта приложение не готово', () => {
    const scope = fork();
    expect(scope.getState($appReady)).toBe(false);
  });

  it('на чистой установке: готово, онбординг не пройден', async () => {
    const scope = fork();
    await allSettled(appStarted, { scope });
    expect(scope.getState($appReady)).toBe(true);
    expect(scope.getState($appError)).toBeNull();
    expect(scope.getState($onboardingDone)).toBe(false);
  });

  it('после перезапуска все сторы восстанавливаются из хранилищ', async () => {
    const first = fork();
    await allSettled(profileSaved, {
      scope: first,
      params: { name: 'Тимур', age: 8, lang: 'ru', mode: 'child' },
    });
    await allSettled(scheduleSaved, {
      scope: first,
      params: { startDate: '2026-11-02', clubDays: [2], homeDays: [1, 3], weeks: 12 },
    });
    await allSettled(exerciseProgressSaved, {
      scope: first,
      params: { exerciseId: 'spiderman', level: 3, cleanSessionsInRow: 1 },
    });
    await allSettled(settingsChanged, { scope: first, params: { remindersEnabled: true } });

    const second = fork();
    await allSettled(appStarted, { scope: second });
    expect(second.getState($appReady)).toBe(true);
    expect(second.getState($profile)).toMatchObject({ name: 'Тимур' });
    expect(second.getState($hasProfile)).toBe(true);
    expect(second.getState($schedule)).toMatchObject({ weeks: 12 });
    expect(second.getState($exerciseLevels)('spiderman')).toBe(3);
    expect(second.getState($settings).remindersEnabled).toBe(true);
    expect(second.getState($onboardingDone)).toBe(true);
  });

  it('онбординг не считается пройденным, если есть только профиль', async () => {
    const first = fork();
    await allSettled(profileSaved, {
      scope: first,
      params: { name: 'Тимур', age: 8, lang: 'ru', mode: 'child' },
    });
    const second = fork();
    await allSettled(appStarted, { scope: second });
    expect(second.getState($onboardingDone)).toBe(false);
  });

  it('ошибка хранилища: приложение не готово, ошибка доступна для показа', async () => {
    env.fail = true;
    const scope = fork();
    await allSettled(appStarted, { scope });
    expect(scope.getState($appReady)).toBe(false);
    expect(scope.getState($appError)).toMatch(/БД недоступна/);
  });
});
