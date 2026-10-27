import { openDatabase } from '../platform';
import { migrate } from './migrations';
import type { Database } from './types';

let ready: Promise<Database> | undefined;

/** БД приложения: открыта и приведена к последней версии схемы. Вызывать из сторов. */
export function getDb(): Promise<Database> {
  ready ??= openDatabase().then(async (db) => {
    await migrate(db);
    return db;
  });
  ready.catch(() => {
    ready = undefined;
  });
  return ready;
}
