import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb, memoryPreferences } from '../../test/store-env';

const env = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  prefs: undefined as ReturnType<typeof memoryPreferences> | undefined,
}));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));
vi.mock('../../shared/lib/platform', () => ({
  preferences: {
    get: (k: string) => env.prefs!.preferences.get(k),
    set: (k: string, v: string) => env.prefs!.preferences.set(k, v),
    remove: (k: string) => env.prefs!.preferences.remove(k),
  },
}));

import { $onboardingDone, appStarted } from '../../app/model';
import { $profile } from '../../entities/profile/model';
import { $plannedSessions, $schedule } from '../../entities/schedule/model';
import { $settings } from '../../entities/settings/model';
import { verifyPin } from '../../shared/lib/pin';
import {
  $draft,
  $finishError,
  ageChanged,
  dayToggled,
  nameChanged,
  onboardingFinished,
  pinChosen,
  remindersChanged,
  startDateChanged,
} from './model';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T10:00:00'));
  env.db = await freshDb();
  env.prefs = memoryPreferences();
});
afterEach(() => vi.useRealTimers());

describe('черновик онбординга', () => {
  it('значения по умолчанию: возраст 8, дома Вт/Чт/Сб, старт сегодня, напоминания включены, PIN нет', () => {
    const d = fork().getState($draft);
    expect(d).toMatchObject({
      name: '',
      age: 8,
      clubDays: [],
      homeDays: [2, 4, 6],
      remindersEnabled: true,
      pin: null,
    });
  });

  it('дни переключаются и держатся отсортированными', async () => {
    const scope = fork();
    await allSettled(dayToggled, { scope, params: { group: 'home', day: 1 } });
    await allSettled(dayToggled, { scope, params: { group: 'home', day: 4 } }); // снять
    expect(scope.getState($draft).homeDays).toEqual([1, 2, 6]);
  });

  it('день, занятый другой группой, не выбирается', async () => {
    const scope = fork();
    await allSettled(dayToggled, { scope, params: { group: 'club', day: 2 } }); // 2 — уже домашний
    expect(scope.getState($draft).clubDays).toEqual([]);
    await allSettled(dayToggled, { scope, params: { group: 'club', day: 3 } });
    await allSettled(dayToggled, { scope, params: { group: 'home', day: 3 } }); // 3 — уже секция
    expect(scope.getState($draft).clubDays).toEqual([3]);
    expect(scope.getState($draft).homeDays).toEqual([2, 4, 6]);
  });
});

describe('завершение онбординга', () => {
  const fill = async (scope: ReturnType<typeof fork>) => {
    await allSettled(nameChanged, { scope, params: '  Тимур ' });
    await allSettled(ageChanged, { scope, params: 9 });
    await allSettled(startDateChanged, { scope, params: '2026-11-09' });
    await allSettled(dayToggled, { scope, params: { group: 'club', day: 3 } });
    await allSettled(remindersChanged, { scope, params: false });
  };

  it('записывает профиль, 12-недельный план, настройки и расписание', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(onboardingFinished, { scope });

    expect(scope.getState($profile)).toMatchObject({ name: 'Тимур', age: 9, lang: 'ru', mode: 'child' });
    expect(scope.getState($schedule)).toMatchObject({
      startDate: '2026-11-09',
      clubDays: [3],
      homeDays: [2, 4, 6],
      weeks: 12,
    });
    const plan = scope.getState($plannedSessions);
    expect(plan).toHaveLength(48); // 12 недель × (3 дома + 1 секция)
    expect(plan[0]?.date).toBe('2026-11-10');
    expect(scope.getState($settings).remindersEnabled).toBe(false);
    expect(scope.getState($finishError)).toBeNull();
  });

  it('после перезапуска онбординг считается пройденным', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(onboardingFinished, { scope });

    const fresh = fork();
    await allSettled(appStarted, { scope: fresh });
    expect(fresh.getState($onboardingDone)).toBe(true);
    expect(fresh.getState($plannedSessions)).toHaveLength(48);
  });

  it('PIN хранится только хешем и проверяется', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(pinChosen, { scope, params: '4821' });
    await allSettled(onboardingFinished, { scope });
    const hash = scope.getState($profile)?.coachPinHash;
    expect(hash).toBeDefined();
    expect(JSON.stringify(await env.db!.query('SELECT data FROM profile'))).not.toContain('4821');
    expect(await verifyPin('4821', hash!)).toBe(true);
    expect(await verifyPin('0000', hash!)).toBe(false);
  });

  it('без PIN («настроить позже») хеша нет', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(onboardingFinished, { scope });
    expect(scope.getState($profile)?.coachPinHash).toBeUndefined();
  });

  it('после успеха черновик (и PIN) очищается из памяти', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(pinChosen, { scope, params: '4821' });
    await allSettled(onboardingFinished, { scope });
    expect(scope.getState($draft)).toMatchObject({ name: '', pin: null });
  });

  it('дата старта в прошлом поднимается до сегодняшней', async () => {
    const scope = fork();
    await fill(scope);
    await allSettled(startDateChanged, { scope, params: '2026-10-01' });
    await allSettled(onboardingFinished, { scope });
    expect(scope.getState($schedule)?.startDate).toBe('2026-11-02');
  });

  it('сбой посреди записи: онбординг не пройден, ошибка видна, черновик цел', async () => {
    env.prefs!.preferences.set.mockRejectedValueOnce(new Error('диск полон'));
    const scope = fork();
    await fill(scope);
    await allSettled(onboardingFinished, { scope });

    expect(scope.getState($finishError)).toMatch(/диск полон/);
    expect(scope.getState($schedule)).toBeNull(); // расписание пишется последним
    expect(scope.getState($draft).name).toBe('  Тимур ');
    const fresh = fork();
    await allSettled(appStarted, { scope: fresh });
    expect(fresh.getState($onboardingDone)).toBe(false);
  });

  it('повтор после сбоя с другой датой старта не оставляет занятий первой попытки', async () => {
    env.prefs!.preferences.set.mockRejectedValueOnce(new Error('сбой'));
    const scope = fork();
    await fill(scope);
    await allSettled(onboardingFinished, { scope }); // упало после записи занятий от 09.11
    expect(
      (await env.db!.query('SELECT id FROM planned_session WHERE deleted_at IS NULL')).length,
    ).toBeGreaterThan(0);

    await allSettled(startDateChanged, { scope, params: '2026-12-01' });
    await allSettled(onboardingFinished, { scope });

    expect(scope.getState($finishError)).toBeNull();
    expect(scope.getState($schedule)?.startDate).toBe('2026-12-01');
    const dates = scope.getState($plannedSessions).map((s) => s.date);
    expect(dates[0]! >= '2026-12-01').toBe(true);
    const alive = await env.db!.query('SELECT id FROM planned_session WHERE deleted_at IS NULL');
    expect(alive).toHaveLength(dates.length);
    expect(await env.db!.query('SELECT id FROM profile')).toHaveLength(1);
  });
});
