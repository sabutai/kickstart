export type SqlValue = string | number | null;

export type Statement = { sql: string; params?: SqlValue[] };

/**
 * Минимальный интерфейс БД, который нужен репозиториям.
 * Реализации: нативный SQLite / jeep-sqlite в `shared/lib/platform`, sql.js в тестах.
 */
export interface Database {
  run(sql: string, params?: SqlValue[]): Promise<void>;
  query<T extends Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Все выражения — атомарно: либо все, либо ни одно. */
  batch(statements: Statement[]): Promise<void>;
}
