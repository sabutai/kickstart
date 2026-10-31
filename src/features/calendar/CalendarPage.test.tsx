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
import { plannedSessionsSaved, scheduleSaved, type PlannedSessionInput } from '../../entities/schedule/model';
import { CalendarPage } from './CalendarPage';

const session = (date: string, over: Partial<PlannedSessionInput> = {}): PlannedSessionInput => ({
  id: `ps-${date}`,
  date,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});

// Сегодня — суббота 7 ноября 2026.
const PLAN = [
  session('2026-11-03', { kind: 'club' }), // прошедшее занятие секции
  session('2026-11-05', { status: 'done' }), // выполненное домашнее
  session('2026-11-07'), // сегодня, суббота
  session('2026-11-10', { kind: 'club' }), // будущее занятие секции
  session('2026-11-14'), // следующая суббота
  session('2026-12-01'),
];

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00'));
  env.db = await freshDb();
});
afterEach(() => vi.useRealTimers());

async function renderCalendar(
  plan: PlannedSessionInput[] = PLAN,
  mode: 'child' | 'coach' = 'child',
): Promise<Scope> {
  const scope = fork();
  await allSettled(plannedSessionsSaved, { scope, params: plan });
  await allSettled(profileSaved, { scope, params: { name: 'Тимур', age: 8, lang: 'ru', mode } });
  render(
    <Provider value={scope}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </Provider>,
  );
  return scope;
}

const card = () => screen.getByRole('region', { name: /(сб|вс|пн|вт|ср|чт|пт),/ });
const day = (name: string) => screen.getByRole('button', { name });

describe('экран календаря', () => {
  it('показывает текущий месяц и статусы дней в доступных именах', async () => {
    await renderCalendar();
    expect(screen.getByRole('heading', { level: 1, name: 'Ноябрь' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Ноябрь 2026' })).toBeInTheDocument();
    expect(day('5 ноября, выполнено')).toBeInTheDocument();
    expect(day('7 ноября, сегодня, запланировано')).toHaveAttribute('aria-current', 'date');
    expect(day('3 ноября, запланировано')).toBeInTheDocument();
    expect(day('4 ноября')).toBeInTheDocument(); // день без занятия
  });

  it('по умолчанию выбран сегодняшний день: карточка с видом, статусом и длительностью', async () => {
    await renderCalendar();
    expect(within(card()).getByText('Сегодня · сб, 7 ноября')).toBeInTheDocument();
    expect(within(card()).getByText('Домашняя тренировка')).toBeInTheDocument();
    expect(within(card()).getByText('Запланировано · ~35 мин')).toBeInTheDocument();
    expect(within(card()).getByRole('link', { name: 'Начать' })).toHaveAttribute('href', '/timer');
  });

  it('«Начать» есть только у сегодняшнего домашнего занятия', async () => {
    await renderCalendar();
    await userEvent.click(day('14 ноября, запланировано'));
    expect(within(card()).queryByRole('link', { name: 'Начать' })).toBeNull();
    expect(within(card()).getByText('сб, 14 ноября')).toBeInTheDocument();
  });

  it('день без занятия — «отдыхаем»', async () => {
    await renderCalendar();
    await userEvent.click(day('4 ноября'));
    expect(within(card()).getByText('В этот день занятий нет — отдыхаем')).toBeInTheDocument();
  });

  it('секция: «Был» отмечает выполненным, «Отменить отметку» возвращает', async () => {
    await renderCalendar();
    await userEvent.click(day('3 ноября, запланировано'));
    expect(within(card()).getByText('Тренировка в секции')).toBeInTheDocument();
    await userEvent.click(within(card()).getByRole('button', { name: 'Был' }));
    expect(await screen.findByRole('button', { name: '3 ноября, выполнено' })).toBeInTheDocument();
    expect(within(card()).getByText('Выполнено')).toBeInTheDocument();

    await userEvent.click(within(card()).getByRole('button', { name: 'Отменить отметку' }));
    expect(await screen.findByRole('button', { name: '3 ноября, запланировано' })).toBeInTheDocument();
  });

  it('будущее занятие секции отметить «Был» нельзя, пропустить — можно', async () => {
    await renderCalendar();
    await userEvent.click(day('10 ноября, запланировано'));
    expect(within(card()).queryByRole('button', { name: 'Был' })).toBeNull();
    await userEvent.click(within(card()).getByRole('button', { name: 'Пропустить' }));
    expect(await screen.findByRole('button', { name: '10 ноября, пропущено' })).toBeInTheDocument();
  });

  it('пропуск домашнего занятия не двигает остальные и отменяется', async () => {
    await renderCalendar();
    await userEvent.click(within(card()).getByRole('button', { name: 'Пропустить' }));
    expect(await screen.findByRole('button', { name: '7 ноября, сегодня, пропущено' })).toBeInTheDocument();
    expect(day('14 ноября, запланировано')).toBeInTheDocument();
    await userEvent.click(within(card()).getByRole('button', { name: 'Отменить отметку' }));
    expect(
      await screen.findByRole('button', { name: '7 ноября, сегодня, запланировано' }),
    ).toBeInTheDocument();
  });

  it('выполненное домашнее занятие отменить вручную нельзя (его закрывает проигрыватель)', async () => {
    await renderCalendar();
    await userEvent.click(day('5 ноября, выполнено'));
    expect(within(card()).queryByRole('button')).toBeNull();
  });

  it('перенос сб → вс: выбор переезжает на воскресенье, подпись «Перенесено с…»', async () => {
    await renderCalendar();
    await userEvent.click(within(card()).getByRole('button', { name: 'Перенести на воскресенье' }));
    expect(await screen.findByRole('button', { name: '8 ноября, запланировано' })).toBeInTheDocument();
    expect(within(card()).getByText(/Перенесено с 7 ноября/)).toBeInTheDocument();
    expect(within(card()).getByText('вс, 8 ноября')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 ноября, сегодня' })).toBeInTheDocument();
    // повторно переносить уже нельзя — это воскресенье
    expect(within(card()).queryByRole('button', { name: 'Перенести на воскресенье' })).toBeNull();
  });

  it('«Перенести» есть только у субботних домашних занятий', async () => {
    await renderCalendar();
    await userEvent.click(day('5 ноября, выполнено'));
    expect(within(card()).queryByRole('button', { name: 'Перенести на воскресенье' })).toBeNull();
    await userEvent.click(day('3 ноября, запланировано')); // секция
    expect(within(card()).queryByRole('button', { name: 'Перенести на воскресенье' })).toBeNull();
  });

  it('перенос на занятое воскресенье отклоняется с понятным текстом', async () => {
    await renderCalendar([...PLAN, session('2026-11-08', { kind: 'club' })]);
    await userEvent.click(within(card()).getByRole('button', { name: 'Перенести на воскресенье' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('В воскресенье уже есть занятие');
    expect(day('7 ноября, сегодня, запланировано')).toBeInTheDocument();
  });

  it('сообщение об отказе пропадает при выборе другого дня', async () => {
    await renderCalendar([...PLAN, session('2026-11-08', { kind: 'club' })]);
    await userEvent.click(within(card()).getByRole('button', { name: 'Перенести на воскресенье' }));
    await screen.findByRole('alert');
    await userEvent.click(day('4 ноября'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('листание месяцев ограничено программой', async () => {
    await renderCalendar();
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Декабрь' })).toBeInTheDocument();
    expect(day('1 декабря, запланировано')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Предыдущий месяц' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Ноябрь' })).toBeInTheDocument();
  });

  it('пустой план: календарь открывается, листать некуда', async () => {
    await renderCalendar([]);
    expect(screen.getByRole('heading', { level: 1, name: 'Ноябрь' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeDisabled();
    expect(within(card()).getByText('В этот день занятий нет — отдыхаем')).toBeInTheDocument();
  });

  it('«Неделя N из 12» считается от старта программы', async () => {
    const scope = await renderCalendar();
    await allSettled(scheduleSaved, {
      scope,
      params: { startDate: '2026-11-02', clubDays: [], homeDays: [1, 3, 6], weeks: 12 },
    });
    expect(await screen.findByText('Неделя 1 из 12')).toBeInTheDocument();
  });

  it('без расписания подписи недели нет', async () => {
    await renderCalendar();
    expect(screen.queryByText(/Неделя \d+ из/)).toBeNull();
  });
});
