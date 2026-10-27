import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestDb } from '../../../test/sqljs-db';
import { SyncMetaSchema } from '../../../entities/user-data/schema';
import { migrate } from './migrations';
import { createRepository, type Repository } from './repository';
import type { Database } from './types';

const NoteSchema = SyncMetaSchema.extend({ date: z.iso.date(), text: z.string() });
type Note = z.infer<typeof NoteSchema>;

let db: Database;
let now: string;
let repo: Repository<Note>;

beforeEach(async () => {
  db = await createTestDb();
  await migrate(db);
  now = '2026-11-02T10:00:00.000Z';
  repo = createRepository<Note>(db, {
    table: 'mini_test', // любая таблица с нужными колонками
    schema: NoteSchema,
    key: (n) => n.date,
    clock: () => now,
  });
});

describe('репозиторий', () => {
  it('save проставляет updatedAt и возвращает сохранённую запись', async () => {
    const saved = await repo.save({ id: 'a', date: '2026-11-02', text: 'раз' });
    expect(saved.updatedAt).toBe(now);
    expect(await repo.get('a')).toEqual(saved);
  });

  it('save существующего id обновляет запись и updatedAt', async () => {
    await repo.save({ id: 'a', date: '2026-11-02', text: 'раз' });
    now = '2026-11-03T10:00:00.000Z';
    await repo.save({ id: 'a', date: '2026-11-02', text: 'два' });
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.get('a')).toMatchObject({ text: 'два', updatedAt: now });
  });

  it('get несуществующего — undefined', async () => {
    expect(await repo.get('нет')).toBeUndefined();
  });

  it('remove — мягкое удаление: запись скрыта, но строка осталась с deletedAt', async () => {
    await repo.save({ id: 'a', date: '2026-11-02', text: 'раз' });
    now = '2026-11-04T10:00:00.000Z';
    await repo.remove('a');
    expect(await repo.get('a')).toBeUndefined();
    expect(await repo.list()).toEqual([]);
    const rows = await db.query<{ deleted_at: string; updated_at: string }>(
      "SELECT deleted_at, updated_at FROM mini_test WHERE id = 'a'",
    );
    expect(rows).toEqual([{ deleted_at: now, updated_at: now }]);
  });

  it('remove несуществующего не падает', async () => {
    await expect(repo.remove('нет')).resolves.toBeUndefined();
  });

  it('save после remove оживляет запись', async () => {
    await repo.save({ id: 'a', date: '2026-11-02', text: 'раз' });
    await repo.remove('a');
    await repo.save({ id: 'a', date: '2026-11-02', text: 'снова' });
    expect(await repo.get('a')).toMatchObject({ text: 'снова' });
    expect((await repo.get('a'))?.deletedAt).toBeUndefined();
  });

  it('findByKey и listByKeyRange работают по дате и отсортированы', async () => {
    for (const [id, date] of [
      ['c', '2026-11-09'],
      ['a', '2026-11-02'],
      ['b', '2026-11-05'],
    ] as const) {
      await repo.save({ id, date, text: id });
    }
    expect((await repo.findByKey('2026-11-05')).map((n) => n.id)).toEqual(['b']);
    expect((await repo.listByKeyRange('2026-11-02', '2026-11-05')).map((n) => n.id)).toEqual(['a', 'b']);
    expect((await repo.list()).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('спецсимволы и кавычки в данных не ломают запросы', async () => {
    const text = `О'Брайен"; DROP TABLE mini_test;--`;
    await repo.save({ id: "x'y", date: '2026-11-02', text });
    expect(await repo.get("x'y")).toMatchObject({ text });
    expect(await repo.list()).toHaveLength(1);
  });

  it('невалидную запись не сохраняет', async () => {
    await expect(repo.save({ id: 'a', date: 'не дата', text: 'x' })).rejects.toThrow();
    expect(await repo.list()).toEqual([]);
  });

  it('повреждённые данные в БД дают понятную ошибку, а не мусор', async () => {
    await db.run(
      "INSERT INTO mini_test (id, key, updated_at, data) VALUES ('bad', '2026-11-02', 't', '{\"id\":\"bad\"}')",
    );
    await expect(repo.get('bad')).rejects.toThrow(/mini_test.*bad/);
  });
});
