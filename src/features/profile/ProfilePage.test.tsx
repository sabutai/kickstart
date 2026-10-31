import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { allSettled, fork, type Scope } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';
import '../../app/i18n';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import { $mode, profileSaved } from '../../entities/profile/model';
import { exerciseProgressSaved } from '../../entities/progress/model';
import { plannedSessionsSaved, type PlannedSessionInput } from '../../entities/schedule/model';
import { ProfilePage } from './ProfilePage';

const session = (date: string, status: PlannedSessionInput['status'] = 'planned'): PlannedSessionInput => ({
  id: `ps-${date}`,
  date,
  stage: 1,
  kind: 'home',
  status,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00'));
  env.db = await freshDb();
});
afterEach(() => vi.useRealTimers());

async function renderProfile(
  opts: { mode?: 'child' | 'coach'; levels?: Record<string, number> } = {},
): Promise<Scope> {
  const scope = fork();
  await allSettled(profileSaved, {
    scope,
    params: { name: 'Тимур', age: 8, lang: 'ru', mode: opts.mode ?? 'child' },
  });
  await allSettled(plannedSessionsSaved, {
    scope,
    params: [session('2026-11-03', 'done'), session('2026-11-05', 'done'), session('2026-11-07')],
  });
  for (const [exerciseId, level] of Object.entries(opts.levels ?? {})) {
    await allSettled(exerciseProgressSaved, { scope, params: { exerciseId, level, cleanSessionsInRow: 0 } });
  }
  render(
    <Provider value={scope}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </Provider>,
  );
  return scope;
}

describe('профиль', () => {
  it('имя, возраст и режим, число выполненных тренировок и серия', async () => {
    await renderProfile();
    expect(screen.getByRole('heading', { level: 1, name: 'Профиль' })).toBeInTheDocument();
    expect(screen.getByText('Тимур')).toBeInTheDocument();
    expect(screen.getByText('8 лет · Ребёнок')).toBeInTheDocument();
    expect(screen.getByText('тренировки')).toBeInTheDocument();
    expect(screen.getByText('Серия 2 дн.')).toBeInTheDocument();
  });

  it('уровни по категориям блока А: уровень виден пипсами и ведёт в библиотеку с фильтром', async () => {
    await renderProfile({ levels: { 'skating-jumps': 3, 'single-leg-stance': 3 } });
    const list = screen.getByRole('list', { name: 'Уровни по категориям' });
    const rows = within(list).getAllByRole('link');
    expect(rows.map((r) => r.textContent)).toEqual(['Разминка', 'Баланс', 'Сила']);
    expect(rows[1]).toHaveAttribute('href', '/library?category=balance');
    expect(within(rows[1]!).getByRole('img', { name: 'Уровень 3 из 5' })).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('img', { name: 'Уровень 1 из 5' })).toBeInTheDocument();
  });

  it('переключатель «Режим взрослого» меняет режим и подпись', async () => {
    const scope = await renderProfile();
    const toggle = screen.getByRole('switch', { name: 'Режим взрослого' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(await screen.findByText('8 лет · Взрослый')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Режим взрослого' })).toHaveAttribute('aria-checked', 'true');
    expect(scope.getState($mode)).toBe('coach');
    await userEvent.click(screen.getByRole('switch', { name: 'Режим взрослого' }));
    expect(await screen.findByText('8 лет · Ребёнок')).toBeInTheDocument();
  });

  it('Кик в аватаре декоративен', async () => {
    await renderProfile();
    expect(document.querySelector('img')).toHaveAttribute('aria-hidden', 'true');
  });
});
