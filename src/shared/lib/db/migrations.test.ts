import { describe, expect, it } from 'vitest';
import { createTestDb } from '../../../test/sqljs-db';
import { LATEST_VERSION, MIGRATIONS, getSchemaVersion, migrate } from './migrations';

const tables = async (db: Awaited<ReturnType<typeof createTestDb>>) =>
  (await db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map(
    (r) => r.name,
  );

describe('миграции', () => {
  it('пустая БД имеет версию 0', async () => {
    expect(await getSchemaVersion(await createTestDb())).toBe(0);
  });

  it('создают таблицы данных и поднимают версию до последней', async () => {
    const db = await createTestDb();
    await migrate(db);
    expect(await getSchemaVersion(db)).toBe(LATEST_VERSION);
    expect(await tables(db)).toEqual(
      expect.arrayContaining([
        'exercise_progress',
        'mini_test',
        'planned_session',
        'profile',
        'schedule',
        'schema_meta',
        'session_log',
      ]),
    );
  });

  it('повторный запуск ничего не ломает и не стирает данные', async () => {
    const db = await createTestDb();
    await migrate(db);
    await db.run("INSERT INTO profile (id, key, updated_at, data) VALUES ('p', NULL, 't', '{}')");
    await migrate(db);
    expect(await db.query('SELECT id FROM profile')).toHaveLength(1);
    expect(await getSchemaVersion(db)).toBe(LATEST_VERSION);
  });

  it('применяет только недостающие миграции', async () => {
    const db = await createTestDb();
    await migrate(db, MIGRATIONS.slice(0, 1));
    expect(await getSchemaVersion(db)).toBe(1);
    const extra = [...MIGRATIONS.slice(0, 1), [{ sql: 'CREATE TABLE extra (id TEXT PRIMARY KEY)' }]];
    await migrate(db, extra);
    expect(await getSchemaVersion(db)).toBe(2);
    expect(await tables(db)).toContain('extra');
  });

  it('неудачная миграция откатывается целиком, версия не растёт', async () => {
    const db = await createTestDb();
    await migrate(db, MIGRATIONS.slice(0, 1));
    const broken = [
      ...MIGRATIONS.slice(0, 1),
      [{ sql: 'CREATE TABLE half_done (id TEXT)' }, { sql: 'THIS IS NOT SQL' }],
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    expect(await tables(db)).not.toContain('half_done');
  });

  it('БД новее приложения — ошибка, а не молчаливая порча', async () => {
    const db = await createTestDb();
    await migrate(db);
    await expect(migrate(db, MIGRATIONS.slice(0, 0))).rejects.toThrow(/новее/);
  });
});
