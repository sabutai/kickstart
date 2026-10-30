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

const today = () => screen.getByRole('region', { name: 'Сегодня' });

describe('главная: шапка', () => {
  it('приветствие по имени, серия на плашке и словами для скринридера', async () => {
    await renderHome([
      session('2026-11-03', { status: 'done' }),
      session('2026-11-05', { status: 'done' }),
      session(TODAY),
    ]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Привет, Тимур');
    expect(screen.getByLabelText('Серия: 2 занятия подряд')).toHaveTextContent('2 дня');
  });

  it('серия 0 и 1 склоняются правильно', async () => {
    await renderHome([session(TODAY)]);
    expect(screen.getByLabelText('Серия: 0 занятий подряд')).toHaveTextContent('0 дней');
  });

  it('кнопка режима показывает текущий режим и переключает его', async () => {
    const scope = await renderHome([session(TODAY)]);
    const button = screen.getByRole('button', { name: 'Режим: Ребёнок. Переключить' });
    expect(button).toHaveTextContent('Ребёнок');
    await userEvent.click(button);
    expect(await screen.findByRole('button', { name: 'Режим: Взрослый. Переключить' })).toHaveTextContent(
      'Взрослый',
    );
    expect(scope.getState($mode)).toBe('coach');
  });
});

describe('главная: состояния дня', () => {
  it('домашнее занятие: подпись, название, длительность и «Начать тренировку» → таймер', async () => {
    await renderHome([session(TODAY)]);
    expect(screen.getByText('Готов к тренировке?')).toBeInTheDocument();
    expect(within(today()).getByText('Сегодня · 35 мин')).toBeInTheDocument();
    expect(within(today()).getByRole('heading', { name: 'Домашняя тренировка' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Начать тренировку' })).toHaveAttribute('href', '/timer');
  });

  it('мини-тест: другое название, без длительности', async () => {
    await renderHome([session(TODAY, { kind: 'test' })]);
    expect(within(today()).getByRole('heading', { name: 'Мини-тест' })).toBeInTheDocument();
    expect(within(today()).getByText('Сегодня')).toBeInTheDocument();
  });

  it('секция: «Был на тренировке» отмечает занятие, карточка переключается на «Выполнено»', async () => {
    await renderHome([session(TODAY, { kind: 'club' }), session('2026-11-10')]);
    expect(screen.getByText('Сегодня тренировка в секции')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Был на тренировке' }));
    expect(await within(today()).findByRole('heading', { name: 'Выполнено' })).toBeInTheDocument();
    expect(screen.getByText('Тренировка выполнена — отличная работа!')).toBeInTheDocument();
    expect(within(today()).getByText('Следующее занятие: вторник, 10 ноября')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Был на тренировке' })).toBeNull();
  });

  it('пропущено сегодня: спокойный текст и следующее занятие', async () => {
    await renderHome([session(TODAY, { status: 'skipped' }), session('2026-11-10')]);
    expect(within(today()).getByRole('heading', { name: 'Пропущено' })).toBeInTheDocument();
    expect(screen.getByText('Сегодня пропускаем — это нормально')).toBeInTheDocument();
  });

  it('день отдыха: «отдыхаем», когда следующее занятие, и нет кнопки старта', async () => {
    await renderHome([session('2026-11-05', { status: 'done' }), session('2026-11-10')]);
    expect(screen.getByText('Сегодня отдыхаем — набирайся сил')).toBeInTheDocument();
    expect(within(today()).getByText('Следующее занятие: вторник, 10 ноября')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Начать тренировку' })).toBeNull();
  });

  it('программа закончилась', async () => {
    await renderHome([session('2026-11-03', { status: 'done' })]);
    expect(screen.getByText('Программа завершена. Так держать!')).toBeInTheDocument();
  });

  it('пустой план не ломает экран', async () => {
    await renderHome([]);
    expect(within(today()).getByText('Больше занятий в плане нет')).toBeInTheDocument();
  });
});

describe('главная: неделя', () => {
  const plan = [
    session('2026-11-02', { status: 'done' }),
    session('2026-11-04', { status: 'done', kind: 'club' }),
    session(TODAY),
    session('2026-11-09', { status: 'done' }), // следующая неделя — в этой полоске не показывается
  ];

  it('семь дней Пн–Вс с названиями, статусами и отметкой «сегодня»', async () => {
    await renderHome(plan);
    const week = screen.getByRole('list', { name: 'Эта неделя' });
    const items = within(week).getAllByRole('listitem');
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual([
      'Понедельник, выполнено',
      'Вторник',
      'Среда, выполнено',
      'Четверг',
      'Пятница',
      'Суббота, сегодня, запланировано',
      'Воскресенье',
    ]);
    expect(items[5]).toHaveAttribute('aria-current', 'date');
  });
});
