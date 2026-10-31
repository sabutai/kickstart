import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { allSettled, fork, type Scope } from 'effector';
import { Provider } from 'effector-react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';
import '../../app/i18n';

const env = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));

import { profileSaved } from '../../entities/profile/model';
import { exerciseProgressSaved } from '../../entities/progress/model';
import { ExercisePage } from './ExercisePage';

beforeEach(async () => {
  env.db = await freshDb();
});

type Setup = { mode?: 'child' | 'coach'; levels?: Record<string, number>; entries?: string[] };

async function renderExercise(
  id: string,
  { mode = 'child', levels = {}, entries }: Setup = {},
): Promise<Scope> {
  const scope = fork();
  await allSettled(profileSaved, { scope, params: { name: 'Тимур', age: 8, lang: 'ru', mode } });
  for (const [exerciseId, level] of Object.entries(levels)) {
    await allSettled(exerciseProgressSaved, { scope, params: { exerciseId, level, cleanSessionsInRow: 0 } });
  }
  const router = createMemoryRouter(
    [
      { path: '/exercise/:exerciseId', element: <ExercisePage /> },
      { path: '/library', element: <p>Библиотека</p> },
      { path: '/timer', element: <p>Таймер</p> },
    ],
    { initialEntries: entries ?? [`/exercise/${id}`] },
  );
  render(
    <Provider value={scope}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return scope;
}

/** renderExercise, но с возможностью размонтировать (несколько экранов в одном тесте). */
async function renderAndGet(id: string) {
  const scope = fork();
  await allSettled(profileSaved, { scope, params: { name: 'Тимур', age: 8, lang: 'ru', mode: 'child' } });
  const router = createMemoryRouter([{ path: '/exercise/:exerciseId', element: <ExercisePage /> }], {
    initialEntries: [`/exercise/${id}`],
  });
  const view = render(
    <Provider value={scope}>
      <RouterProvider router={router} />
    </Provider>,
  );
  await screen.findByRole('heading', { level: 1 });
  return view;
}

describe('экран упражнения: ребёнок', () => {
  it('название, категория, объём одной строкой, «Зачем», шаги', async () => {
    await renderExercise('skating-jumps');
    expect(await screen.findByRole('heading', { level: 1, name: 'Прыжки конькобежца' })).toBeInTheDocument();
    expect(screen.getByText('Баланс')).toBeInTheDocument();
    expect(
      screen.getByText('Уровень 1 · 2 подхода по 5 повторов на сторону · отдых 30 сек'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Укрепляет голеностоп и колено/)).toHaveTextContent('Зачем:');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(5);
    expect(
      screen.getByText('Прыжок с ноги на ногу вперёд-вбок, держать равновесие 3 с.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Стоя на левой ноге, колено слегка согнуто, правая нога чуть приподнята.'),
    ).toBeInTheDocument();
  });

  it('демонстрация (пока заглушка с Киком и пометкой) и кнопка «Начать» → /timer', async () => {
    await renderExercise('skating-jumps');
    expect(
      await screen.findByRole('group', { name: 'Демонстрация: Прыжки конькобежца' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Начать' })).toHaveAttribute('href', '/timer');
  });

  it('ребёнку не показываем блок «Для взрослого»', async () => {
    await renderExercise('skating-jumps');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText('Для взрослого')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Уровни' })).toBeNull();
  });

  it('уровень берётся из прогресса ребёнка', async () => {
    await renderExercise('skating-jumps', { levels: { 'skating-jumps': 3 } });
    expect(await screen.findByText(/^Уровень 3 · /)).toBeInTheDocument();
    expect(screen.getByText(/Мяч лежит на раскрытой вытянутой ладони/)).toBeInTheDocument();
  });

  it('перекат: предупреждение о матрасе; уровень выше 3 дома не показывается', async () => {
    await renderExercise('sideways-roll', { levels: { 'sideways-roll': 5 } });
    expect(await screen.findByText(/^Уровень 3 · /)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('на ковре или матрасе');
  });

  it('упражнение без матрасных ограничений — без предупреждения', async () => {
    await renderExercise('spiderman');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('упражнение блока Б: один уровень — без строки уровня, «Как делать» шагами, время вместо повторов', async () => {
    await renderExercise('toe-taps');
    expect(await screen.findByRole('heading', { level: 1, name: 'Тычки' })).toBeInTheDocument();
    expect(screen.getByText('2 подхода по 30–45 сек · отдых 20 сек')).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps.slice(0, 3)).toEqual([
      '1Мяч перед собой.',
      '2Поочерёдно касаться верха мяча подошвой правой и левой ноги, как бег на месте.',
      '3Мяч не двигается',
    ]);
    expect(screen.queryByText(/Зачем:/)).toBeNull();
  });

  it('блок Б: «На что смотреть» и общие правила блока видны ребёнку', async () => {
    await renderExercise('toe-taps');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/Касание передней частью подошвы без давления/)).toHaveTextContent(
      'На что смотреть:',
    );
    const common = screen.getByRole('region', { name: 'Общее' });
    expect(within(common).getByText('Касания лёгкие — мяч «гладим», не пинаем.')).toBeInTheDocument();
    expect(within(common).getAllByRole('listitem')).toHaveLength(4);
  });

  it('блок В и мобильность: свои общие правила; у игр их нет', async () => {
    const { unmount } = await renderAndGet('ladder');
    expect(
      within(screen.getByRole('region', { name: 'Общее' })).getByText(/Качество важнее скорости/),
    ).toBeInTheDocument();
    unmount();
    const second = await renderAndGet('deep-squat');
    expect(
      within(screen.getByRole('region', { name: 'Общее' })).getByText(/Статическая растяжка/),
    ).toBeInTheDocument();
    second.unmount();
    await renderAndGet('traffic-light');
    expect(screen.queryByRole('region', { name: 'Общее' })).toBeNull();
  });

  it('блок А: команда ребёнку видна всем, ошибки — только взрослому', async () => {
    await renderExercise('sideways-roll');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/Свернись в мячик!/)).toHaveTextContent('Команда:');
    expect(screen.queryByText('Голова касается матраса')).toBeNull();
  });

  it('несуществующее упражнение: понятный экран и путь в библиотеку', async () => {
    await renderExercise('нет-такого');
    expect(await screen.findByRole('heading', { name: 'Такого упражнения нет' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К упражнениям' })).toHaveAttribute('href', '/library');
  });
});

describe('экран упражнения: «Назад»', () => {
  it('открыли по прямой ссылке — ведёт в библиотеку', async () => {
    await renderExercise('skating-jumps');
    await userEvent.click(await screen.findByRole('button', { name: 'Назад' }));
    expect(await screen.findByText('Библиотека')).toBeInTheDocument();
  });

  it('пришли из списка — возвращает на предыдущий экран', async () => {
    await renderExercise('skating-jumps', { entries: ['/library', '/exercise/skating-jumps'] });
    await userEvent.click(await screen.findByRole('button', { name: 'Назад' }));
    expect(await screen.findByText('Библиотека')).toBeInTheDocument();
  });
});

describe('экран упражнения: взрослый', () => {
  it('видит блок «Для взрослого»: ошибки, команду и переключатель всех уровней; «не дома» у небезопасных', async () => {
    await renderExercise('sideways-roll', { mode: 'coach' });
    await screen.findByRole('heading', { level: 1, name: 'Перекат вбок' });
    const adult = screen.getByRole('region', { name: 'Для взрослого' });
    expect(within(adult).getByText('Голова касается матраса')).toBeInTheDocument();
    const tabs = within(screen.getByRole('group', { name: 'Уровни' }));
    expect(tabs.getAllByRole('button')).toHaveLength(5);
    expect(tabs.getByRole('button', { name: 'Ур. 3' })).toBeInTheDocument();
    expect(tabs.getByRole('button', { name: 'Ур. 4 · не дома' })).toBeInTheDocument();
    expect(tabs.getByRole('button', { name: 'Ур. 5 · не дома' })).toBeInTheDocument();
  });

  it('переключение уровня меняет текст и объём', async () => {
    await renderExercise('single-leg-stance', { mode: 'coach' });
    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.getByText('Уровень 1 · 1 подход по 5 повторов на сторону · отдых 30 сек'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ур. 5' }));
    expect(screen.getByText('Уровень 5 · 1 подход по 20 сек на сторону · отдых 30 сек')).toBeInTheDocument();
    expect(screen.getByText(/Оба держат по мячу на уровне груди/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ур. 5', pressed: true })).toBeInTheDocument();
  });

  it('блок Б для взрослого: блока «Для взрослого» нет (нет ни уровней, ни ошибок)', async () => {
    await renderExercise('toe-taps', { mode: 'coach' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('region', { name: 'Для взрослого' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Уровни' })).toBeNull();
  });
});
