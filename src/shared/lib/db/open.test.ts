import { describe, expect, it, vi } from 'vitest';
import { createTestDb } from '../../../test/sqljs-db';
import { LATEST_VERSION, getSchemaVersion } from './migrations';

describe('getDb', () => {
  it('открывает БД один раз и применяет миграции', async () => {
    const db = await createTestDb();
    const openDatabase = vi.fn(async () => db);
    vi.resetModules();
    vi.doMock('../platform', () => ({ openDatabase }));
    const { getDb } = await import('./open');

    const [a, b] = await Promise.all([getDb(), getDb()]);
    expect(a).toBe(b);
    expect(openDatabase).toHaveBeenCalledTimes(1);
    expect(await getSchemaVersion(a)).toBe(LATEST_VERSION);
  });

  it('после неудачного открытия можно попробовать снова', async () => {
    const db = await createTestDb();
    const openDatabase = vi.fn().mockRejectedValueOnce(new Error('нет доступа')).mockResolvedValue(db);
    vi.resetModules();
    vi.doMock('../platform', () => ({ openDatabase }));
    const { getDb } = await import('./open');

    await expect(getDb()).rejects.toThrow('нет доступа');
    await expect(getDb()).resolves.toBe(db);
  });
});
