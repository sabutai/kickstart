/// <reference types="node" />
import initSqlJs from 'sql.js';
import type { Database, SqlValue, Statement } from '../shared/lib/db/types';

/** БД в памяти на sql.js — тот же движок, что у веб-фолбэка, без нативных зависимостей. */
export async function createTestDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return {
    async run(sql, params = []) {
      db.run(sql, params);
    },
    async query<T extends Record<string, SqlValue>>(sql: string, params: SqlValue[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async batch(statements: Statement[]) {
      db.run('BEGIN');
      try {
        for (const s of statements) db.run(s.sql, s.params ?? []);
        db.run('COMMIT');
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
  };
}
