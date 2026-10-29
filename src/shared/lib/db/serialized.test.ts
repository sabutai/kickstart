import { describe, expect, it } from 'vitest';
import { serialized } from './serialized';
import type { Database, SqlValue, Statement } from './types';

/** «База», которая, как транзакции одного соединения SQLite, не терпит пересекающихся операций. */
function fragileDb() {
  let busy = false;
  const log: string[] = [];
  const op = async <T>(name: string, result: T, fail = false): Promise<T> => {
    if (busy) throw new Error(`пересечение операций: ${name}`);
    busy = true;
    log.push(`start ${name}`);
    await new Promise((r) => setTimeout(r, 5));
    log.push(`end ${name}`);
    busy = false;
    if (fail) throw new Error(`сбой ${name}`);
    return result;
  };
  const db: Database = {
    run: (sql: string) => op(sql, undefined, sql === 'FAIL'),
    query: <T extends Record<string, SqlValue>>(sql: string) => op(sql, [] as T[]),
    batch: (statements: Statement[]) => op(`batch:${statements.length}`, undefined),
  };
  return { db, log };
}

describe('serialized', () => {
  it('без очереди одновременные операции пересекаются (проверка самой «базы»)', async () => {
    const { db } = fragileDb();
    const results = await Promise.allSettled([db.run('a'), db.run('b')]);
    expect(results.some((r) => r.status === 'rejected')).toBe(true);
  });

  it('с очередью операции выполняются строго по одной, в порядке вызова', async () => {
    const { db, log } = fragileDb();
    const safe = serialized(db);
    await Promise.all([
      safe.run('a'),
      safe.run('b'),
      safe.query('c'),
      safe.batch([{ sql: 'x' }, { sql: 'y' }]),
      safe.run('d'),
    ]);
    expect(log).toEqual([
      'start a',
      'end a',
      'start b',
      'end b',
      'start c',
      'end c',
      'start batch:2',
      'end batch:2',
      'start d',
      'end d',
    ]);
  });

  it('результаты возвращаются каждому вызывающему', async () => {
    const { db } = fragileDb();
    const safe = serialized(db);
    const [rows, nothing] = await Promise.all([safe.query('q'), safe.run('r')]);
    expect(rows).toEqual([]);
    expect(nothing).toBeUndefined();
  });

  it('сбой одной операции не блокирует очередь и не теряет остальные', async () => {
    const { db, log } = fragileDb();
    const safe = serialized(db);
    const [a, b, c] = await Promise.allSettled([safe.run('a'), safe.run('FAIL'), safe.run('c')]);
    expect(a.status).toBe('fulfilled');
    expect(b).toMatchObject({ status: 'rejected' });
    expect(c.status).toBe('fulfilled');
    expect(log.at(-1)).toBe('end c');
  });

  it('очередь не накапливает «залипшую» ошибку: следующая операция после сбоя работает', async () => {
    const { db } = fragileDb();
    const safe = serialized(db);
    await expect(safe.run('FAIL')).rejects.toThrow('сбой FAIL');
    await expect(safe.run('ok')).resolves.toBeUndefined();
  });
});
