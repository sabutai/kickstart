import { vi } from 'vitest';
import { migrate } from '../shared/lib/db/migrations';
import type { Database } from '../shared/lib/db/types';
import { createTestDb } from './sqljs-db';

/**
 * Окружение для тестов сторов. В файле теста должно быть (vi.mock поднимается наверх файла):
 *
 *   const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
 *   vi.mock('<путь>/shared/lib/db/open', () => ({ getDb: async () => env.db! }));
 *   beforeEach(async () => { env.db = await freshDb(); });
 */
export async function freshDb(): Promise<Database> {
  const db = await createTestDb();
  await migrate(db);
  return db;
}

/** Хранилище настроек в памяти вместо Capacitor Preferences. */
export function memoryPreferences() {
  const data = new Map<string, string>();
  return {
    data,
    preferences: {
      get: vi.fn(async (key: string) => data.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => void data.set(key, value)),
      remove: vi.fn(async (key: string) => void data.delete(key)),
    },
  };
}
