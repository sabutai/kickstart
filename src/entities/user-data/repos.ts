import { getDb } from '../../shared/lib/db/open';
import { createUserDataRepositories, type UserDataRepositories } from './repositories';

/** Репозитории на открытой БД приложения; вызывать из эффектов сторов. */
export async function getRepositories(): Promise<UserDataRepositories> {
  return createUserDataRepositories(await getDb());
}
