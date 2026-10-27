import type { z } from 'zod';
import type { SyncMeta } from '../../../entities/user-data/schema';
import type { DataTable } from './migrations';
import type { Database } from './types';

type Row = { data: string };

export type RepositorySpec<T extends SyncMeta> = {
  table: DataTable;
  schema: z.ZodType<T>;
  /** Индексируемое поле для выборок (обычно дата или id упражнения). */
  key?: (entity: T) => string | null;
  /** Источник времени для `updatedAt`; в тестах подменяется. */
  clock?: () => string;
};

export interface Repository<T extends SyncMeta> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  findByKey(key: string): Promise<T[]>;
  /** Записи с key в [from, to] включительно (ISO-даты сортируются как строки). */
  listByKeyRange(from: string, to: string): Promise<T[]>;
  /** Создаёт или обновляет запись; `updatedAt` ставится здесь, `deletedAt` сбрасывается. */
  save(input: Omit<T, 'updatedAt' | 'deletedAt'>): Promise<T>;
  /** Мягкое удаление: строка остаётся с `deletedAt` — это нужно будущей синхронизации. */
  remove(id: string): Promise<void>;
}

export function createRepository<T extends SyncMeta>(db: Database, spec: RepositorySpec<T>): Repository<T> {
  const { table, schema } = spec;
  const clock = spec.clock ?? (() => new Date().toISOString());

  const decode = (row: Row, id?: string): T => {
    try {
      return schema.parse(JSON.parse(row.data));
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(`Повреждённая запись ${table}/${id ?? '?'}: ${reason}`);
    }
  };

  const select = async (where: string, params: string[]): Promise<T[]> => {
    const rows = await db.query<Row & { id: string }>(
      `SELECT id, data FROM ${table} WHERE deleted_at IS NULL ${where} ORDER BY key, id`,
      params,
    );
    return rows.map((r) => decode(r, r.id));
  };

  return {
    async get(id) {
      const [entity] = await select('AND id = ?', [id]);
      return entity;
    },
    list: () => select('', []),
    findByKey: (key) => select('AND key = ?', [key]),
    listByKeyRange: (from, to) => select('AND key >= ? AND key <= ?', [from, to]),

    async save(input) {
      const { deletedAt: _dropped, ...rest } = input as Partial<T> & Omit<T, 'updatedAt' | 'deletedAt'>;
      const entity = schema.parse({ ...rest, updatedAt: clock() });
      await db.run(
        `INSERT OR REPLACE INTO ${table} (id, key, updated_at, deleted_at, data) VALUES (?, ?, ?, NULL, ?)`,
        [entity.id, spec.key?.(entity) ?? null, entity.updatedAt, JSON.stringify(entity)],
      );
      return entity;
    },

    async remove(id) {
      const rows = await db.query<Row & { key: string | null }>(
        `SELECT key, data FROM ${table} WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      const row = rows[0];
      if (!row) return;
      const at = clock();
      const data = JSON.stringify({ ...JSON.parse(row.data), updatedAt: at, deletedAt: at });
      await db.run(`UPDATE ${table} SET updated_at = ?, deleted_at = ?, data = ? WHERE id = ?`, [
        at,
        at,
        data,
        id,
      ]);
    },
  };
}
