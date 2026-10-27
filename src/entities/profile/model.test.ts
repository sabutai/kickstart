import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import { $hasProfile, $mode, $profile, loadProfileFx, modeChanged, profileSaved } from './model';

const timur = { name: 'Тимур', age: 8, lang: 'ru', mode: 'child' } as const;

beforeEach(async () => {
  env.db = await freshDb();
});

describe('стор профиля', () => {
  it('без профиля: null, режим «ребёнок», hasProfile = false', async () => {
    const scope = fork();
    await allSettled(loadProfileFx, { scope });
    expect(scope.getState($profile)).toBeNull();
    expect(scope.getState($mode)).toBe('child');
    expect(scope.getState($hasProfile)).toBe(false);
  });

  it('profileSaved создаёт профиль с id и сохраняет в БД', async () => {
    const scope = fork();
    await allSettled(profileSaved, { scope, params: timur });
    const profile = scope.getState($profile);
    expect(profile).toMatchObject(timur);
    expect(profile?.id).toBeTruthy();
    expect(scope.getState($hasProfile)).toBe(true);

    const fresh = fork(); // «перезапуск приложения»
    await allSettled(loadProfileFx, { scope: fresh });
    expect(fresh.getState($profile)).toEqual(profile);
  });

  it('повторное сохранение обновляет тот же профиль, а не создаёт второй', async () => {
    const scope = fork();
    await allSettled(profileSaved, { scope, params: timur });
    const id = scope.getState($profile)!.id;
    await allSettled(profileSaved, { scope, params: { ...timur, name: 'Тимур Б.', age: 9 } });
    expect(scope.getState($profile)).toMatchObject({ id, name: 'Тимур Б.', age: 9 });
    const rows = await env.db!.query('SELECT id FROM profile');
    expect(rows).toHaveLength(1);
  });

  it('modeChanged меняет режим и сохраняет PIN', async () => {
    const scope = fork();
    await allSettled(profileSaved, { scope, params: { ...timur, coachPinHash: 'hash' } });
    await allSettled(modeChanged, { scope, params: 'coach' });
    expect(scope.getState($mode)).toBe('coach');
    expect(scope.getState($profile)).toMatchObject({ mode: 'coach', coachPinHash: 'hash', name: 'Тимур' });

    const fresh = fork();
    await allSettled(loadProfileFx, { scope: fresh });
    expect(fresh.getState($mode)).toBe('coach');
  });

  it('modeChanged без профиля ничего не делает', async () => {
    const scope = fork();
    await allSettled(modeChanged, { scope, params: 'coach' });
    expect(scope.getState($profile)).toBeNull();
    expect(await env.db!.query('SELECT id FROM profile')).toHaveLength(0);
  });

  it('невалидный профиль не сохраняется, стор не меняется', async () => {
    const scope = fork();
    await allSettled(profileSaved, { scope, params: timur });
    const before = scope.getState($profile);
    await allSettled(profileSaved, { scope, params: { ...timur, name: '' } });
    expect(scope.getState($profile)).toEqual(before);
  });
});
