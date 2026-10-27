import { Capacitor } from '@capacitor/core';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Database, SqlValue, Statement } from '../db/types';

const DB_NAME = 'kickstart';

/**
 * Нативный SQLite на Android; в браузере — jeep-sqlite (sql.js, wasm из public/wasm,
 * хранение в IndexedDB). Плагины грузятся динамически, при первом обращении к БД.
 */
async function connect(): Promise<{ conn: SQLiteDBConnection; persist: () => Promise<void> }> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const isWeb = Capacitor.getPlatform() === 'web';

  if (isWeb) {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);
    const element = document.createElement('jeep-sqlite');
    element.setAttribute('wasmpath', `${import.meta.env.BASE_URL}wasm`);
    document.body.appendChild(element);
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await conn.open();

  // В вебе изменения живут в памяти, пока не сохранены в IndexedDB.
  const persist = isWeb ? () => sqlite.saveToStore(DB_NAME) : async () => {};
  return { conn, persist };
}

let opening: Promise<Database> | undefined;

/** Открывает БД один раз на приложение (повторные вызовы возвращают тот же объект). */
export function openDatabase(): Promise<Database> {
  opening ??= connect().then(({ conn, persist }): Database => ({
    async run(sql, params = []) {
      await conn.run(sql, params, true);
      await persist();
    },
    async query<T extends Record<string, SqlValue>>(sql: string, params: SqlValue[] = []) {
      const { values } = await conn.query(sql, params);
      return (values ?? []) as T[];
    },
    async batch(statements: Statement[]) {
      await conn.executeSet(
        statements.map((s) => ({ statement: s.sql, values: s.params ?? [] })),
        true,
      );
      await persist();
    },
  }));
  // Неудачное открытие не должно залипнуть навсегда.
  opening.catch(() => {
    opening = undefined;
  });
  return opening;
}
