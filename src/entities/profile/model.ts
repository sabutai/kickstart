import { createEffect, createEvent, createStore, sample } from 'effector';
import { newId } from '../../shared/lib/id';
import { getRepositories } from '../user-data/repos';
import type { Profile } from '../user-data/schema';

/** Данные профиля без служебных полей (id и SyncMeta проставляет хранилище). */
export type ProfileInput = Omit<Profile, 'id' | 'updatedAt' | 'deletedAt'>;

// Один ребёнок на устройство: профиль единственный.
export const loadProfileFx = createEffect(async (): Promise<Profile | null> => {
  const repos = await getRepositories();
  return (await repos.profiles.list())[0] ?? null;
});

const saveProfileFx = createEffect(async (input: ProfileInput): Promise<Profile> => {
  const repos = await getRepositories();
  const existing = (await repos.profiles.list())[0];
  return repos.profiles.save({ ...input, id: existing?.id ?? newId() });
});

/** Создать или обновить профиль целиком. */
export const profileSaved = createEvent<ProfileInput>();
/** Переключить режим «ребёнок/взрослый» (проверку PIN делает вызывающий — этап 6). */
export const modeChanged = createEvent<Profile['mode']>();

export const $profile = createStore<Profile | null>(null)
  .on(loadProfileFx.doneData, (_, profile) => profile)
  .on(saveProfileFx.doneData, (_, profile) => profile);

export const $hasProfile = $profile.map((p) => p !== null);
export const $mode = $profile.map((p) => p?.mode ?? 'child');

sample({ clock: profileSaved, target: saveProfileFx });

sample({
  clock: modeChanged,
  source: $profile,
  filter: (profile) => profile !== null, // без профиля переключать нечего
  fn: (profile, mode): ProfileInput => {
    const { id: _id, updatedAt: _updatedAt, deletedAt: _deletedAt, ...rest } = profile!;
    return { ...rest, mode };
  },
  target: saveProfileFx,
});
