import type { Database } from './types';

/**
 * Выстраивает все операции в очередь: одно соединение SQLite не переносит пересекающиеся транзакции
 * (две одновременные записи — например, журнал и статус занятия сразу после тренировки — теряли
 * одну из них). Порядок вызова сохраняется; сбой одной операции остальные не затрагивает.
 */
export function serialized(db: Database): Database {
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  return {
    run: (sql, params) => enqueue(() => db.run(sql, params)),
    query: (sql, params) => enqueue(() => db.query(sql, params)),
    batch: (statements) => enqueue(() => db.batch(statements)),
  };
}
