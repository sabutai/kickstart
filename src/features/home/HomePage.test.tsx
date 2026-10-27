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

import { profileSaved } from '../../entities/profile/model';
import { plannedSessionsSaved, type PlannedSessionInput } from '../../entities/schedule/model';
import { HomePage } from './HomePage';

const session = (date: string, over: Partial<PlannedSessionInput> = {}): PlannedSessionInput => ({
  id: `ps-${date}`,
  date,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});

// Сегодня — суббота 7 ноября 2026.
const TODAY = '2026-11-07';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  env.db = await freshDb();
});
afterEach(() => vi.useRealTimers());

async function renderHome(plan: PlannedSessionInput[], mode: 'child' | 'coach' = 'child'): Promise<Scope> {
  const scope = fork();
  await allSettled(plannedSessionsSaved, { scope, params: plan });
  await allSettled(profileSaved, { scope, params: { name: 'Тимур', age: 8, lang: 'ru', mode } });
  render(
    <Provider value={scope}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </Provider>,
  );
  return scope;
}

const card = () => screen.getByRole('region');

describe('главная: приветствие и серия', () => {
  it('приветствует по имени, серию объявляет словами', async () => {
    await renderHome([
      session('2026-11-03', { status: 'done' }),
      session('2026-11-05', { status: 'done' }),
      session(TODAY),
    ]);
    expect(screen.getByRole('heading', { level: 1, name: 'Привет, Тимур' })).toBeInTheDocument();
    expect(screen.getByLabelText('Серия: 2 занятия подряд')).toBeInTheDocument();
  });

  it('серия 0 и 1 склоняются правильно', async () => {
    await renderHome([session(TODAY)]);
    expect(screen.getByLabelText('Серия: 0 занятий подряд')).toBeInTheDocument();
  });
});

describe('главная: состояния дня', () => {
  it('домашнее занятие: подпись, название, длительность и «Начать» → таймер', async () => {
    await renderHome([session(TODAY)]);
    expect(screen.getByText('Готов к сегодняшней тренировке?')).toBeInTheDocument();
    expect(within(card()).getByRole('heading', { name: 'Домашняя тренировка' })).toBeInTheDocument();
    expect(within(card()).getByText('~35 мин')).toBeInTheDocument();
    expect(within(card()).getByRole('link', { name: 'Начать' })).toHaveAttribute('href', '/timer');
  });

  it('мини-тест: другое название, без длительности', async () => {
    await renderHome([session(TODAY, { kind: 'test' })]);
    expect(within(card()).getByRole('heading', { name: 'Мини-тест' })).toBeInTheDocument();
    expect(within(card()).queryByText('~35 мин')).toBeNull();
  });

  it('секция: «Был» отмечает занятие, карточка переключается на «Выполнено»', async () => {
    await renderHome([session(TODAY, { kind: 'club' }), session('2026-11-10')]);
    expect(screen.getByText('Сегодня тренировка в секции')).toBeInTheDocument();
    await userEvent.click(within(card()).getByRole('button', { name: 'Был' }));
    expect(await within(card()).findByRole('heading', { name: 'Выполнено' })).toBeInTheDocument();
    expect(screen.getByText('Тренировка выполнена — отличная работа!')).toBeInTheDocument();
    expect(within(card()).getByText('Следующее занятие: вторник, 10 ноября')).toBeInTheDocument();
  });

  it('пропущено сегодня: спокойный текст и следующее занятие', async () => {
    await renderHome([session(TODAY, { status: 'skipped' }), session('2026-11-10')]);
    expect(within(card()).getByRole('heading', { name: 'Пропущено' })).toBeInTheDocument();
    expect(screen.getByText('Сегодня пропускаем — это нормально')).toBeInTheDocument();
  });

  it('день отдыха: «отдыхаем» и когда следующее занятие', async () => {
    await renderHome([session('2026-11-05', { status: 'done' }), session('2026-11-10')]);
    expect(screen.getAllByText('Сегодня отдыхаем — набирайся сил').length).toBeGreaterThan(0);
    expect(within(card()).getByText('Следующее занятие: вторник, 10 ноября')).toBeInTheDocument();
    expect(within(card()).queryByRole('link', { name: 'Начать' })).toBeNull();
  });

  it('программа закончилась', async () => {
    await renderHome([session('2026-11-03', { status: 'done' })]);
    expect(screen.getAllByText('Программа завершена. Так держать!').length).toBeGreaterThan(0);
  });

  it('пустой план не ломает экран', async () => {
    await renderHome([]);
    expect(within(card()).getByText('Больше занятий в плане нет')).toBeInTheDocument();
    expect(screen.getByText('На этой неделе занятий нет')).toBeInTheDocument();
  });
});

describe('главная: цель недели и категории', () => {
  it('цель недели: выполнено из запланированного на неделе Пн–Вс', async () => {
    await renderHome([
      session('2026-11-02', { status: 'done' }),
      session('2026-11-04', { status: 'done', kind: 'club' }),
      session(TODAY),
      session('2026-11-09', { status: 'done' }), // следующая неделя — не считается
    ]);
    expect(screen.getByText('2 из 3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Цель недели' })).toHaveAttribute('aria-valuenow', '67');
  });

  it('чипы категорий — ссылки в библиотеку с фильтром', async () => {
    await renderHome([session(TODAY)]);
    const nav = screen.getByRole('navigation', { name: 'Упражнения' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(within(nav).getByRole('link', { name: 'Баланс' })).toHaveAttribute(
      'href',
      '/library?category=balance',
    );
    expect(within(nav).getByRole('link', { name: 'Мобильность' })).toHaveAttribute(
      'href',
      '/library?category=mobility',
    );
  });
});

describe('главная: режимы', () => {
  const plan = [
    session('2026-11-03', { status: 'done' }),
    session('2026-11-05', { status: 'done' }),
    session(TODAY),
  ];

  it('ребёнок: статистики нет', async () => {
    await renderHome(plan);
    expect(screen.queryByText('Тренировок')).toBeNull();
  });

  it('взрослый: тренировок, серия и цель недели', async () => {
    await renderHome(plan, 'coach');
    const terms = screen.getAllByRole('term').map((n) => n.textContent);
    expect(terms).toEqual(['Тренировок', 'Серия', 'Цель недели']);
    expect(screen.getAllByRole('definition').map((n) => n.textContent)).toEqual(['2', '2', '2/3']);
  });
});
