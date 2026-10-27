import type { Database, Statement } from './types';

/** Одна миграция — набор выражений, применяется атомарно вместе с повышением версии. */
export type Migration = Statement[];

// Таблицы пользовательских данных одинаковы: SyncMeta в колонках (для будущей синхронизации и
// запросов), запись целиком — в JSON `data` (источник истины, проверяется Zod при чтении),
// `key` — индексируемое поле для выборок (дата, id упражнения).
export const DATA_TABLES = [
  'profile',
  'schedule',
  'planned_session',
  'session_log',
  'exercise_progress',
  'mini_test',
] as const;
export type DataTable = (typeof DATA_TABLES)[number];

const createDataTable = (table: DataTable): Statement[] => [
  {
    sql: `CREATE TABLE ${table} (
      id TEXT PRIMARY KEY,
      key TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      data TEXT NOT NULL
    )`,
  },
  { sql: `CREATE INDEX idx_${table}_key ON ${table} (key)` },
];

/**
 * Версия схемы = номер миграции (с 1). Уже выпущенные миграции НЕ редактируем —
 * изменения только новой миграцией в конец списка.
 */
export const MIGRATIONS: Migration[] = [DATA_TABLES.flatMap(createDataTable)];

export const LATEST_VERSION = MIGRATIONS.length;

const META_DDL = 'CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)';

export async function getSchemaVersion(db: Database): Promise<number> {
  await db.run(META_DDL);
  const rows = await db.query<{ value: string }>("SELECT value FROM schema_meta WHERE key = 'version'");
  return rows[0] ? Number(rows[0].value) : 0;
}

/** Применяет недостающие миграции. БД новее приложения — ошибка: не рискуем портить данные. */
export async function migrate(db: Database, migrations: Migration[] = MIGRATIONS): Promise<void> {
  const current = await getSchemaVersion(db);
  if (current > migrations.length) {
    throw new Error(`Версия БД (${current}) новее приложения (${migrations.length}). Обновите приложение.`);
  }
  for (let version = current + 1; version <= migrations.length; version++) {
    await db.batch([
      ...migrations[version - 1]!,
      {
        sql: "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)",
        params: [String(version)],
      },
    ]);
  }
}
