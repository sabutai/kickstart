import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { Database } from '../shared/lib/db/types';
import { createUserDataRepositories } from '../entities/user-data/repositories';
import { freshDb, memoryPreferences } from '../test/store-env';
import { routes } from './routes';
import './i18n';

const env = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  prefs: undefined as ReturnType<typeof memoryPreferences> | undefined,
  failOpen: false,
}));
vi.mock('../shared/lib/db/open', () => ({
  getDb: async () => {
    if (env.failOpen) throw new Error('БД недоступна');
    return env.db!;
  },
}));
vi.mock('../shared/lib/platform', () => ({
  appLifecycle: { onBackButton: () => () => {}, exit: vi.fn() },
  preferences: {
    get: (k: string) => env.prefs!.preferences.get(k),
    set: (k: string, v: string) => env.prefs!.preferences.set(k, v),
    remove: (k: string) => env.prefs!.preferences.remove(k),
  },
}));

beforeEach(async () => {
  env.db = await freshDb();
  env.prefs = memoryPreferences();
  env.failOpen = false;
});

/** Профиль и расписание в БД — как после пройденного онбординга. */
async function seedOnboarded() {
  const repos = createUserDataRepositories(env.db!);
  await repos.profiles.save({ id: 'p', name: 'Тимур', age: 8, lang: 'ru', mode: 'child' });
  await repos.schedules.save({
    id: 's',
    startDate: '2026-11-02',
    clubDays: [],
    homeDays: [2, 4, 6],
    weeks: 12,
  });
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Provider value={fork()}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

describe('каркас приложения (онбординг пройден)', () => {
  beforeEach(seedOnboarded);

  it('открывает главную с нижней навигацией из 5 табов', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Привет, Тимур' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(nav.querySelectorAll('a')).toHaveLength(5);
  });

  it('переключает табы', async () => {
    renderAt('/');
    await userEvent.click(await screen.findByRole('link', { name: 'Календарь' }));
    expect(await screen.findByRole('heading', { name: 'Календарь' })).toBeInTheDocument();
  });

  it('полноэкранные экраны открываются без таб-бара', async () => {
    renderAt('/exercise/skating-jumps');
    expect(await screen.findByRole('heading', { name: 'Прыжки конькобежца' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('пройденный онбординг не показывается снова', async () => {
    renderAt('/onboarding/2');
    expect(await screen.findByRole('heading', { name: 'Привет, Тимур' })).toBeInTheDocument();
  });
});

describe('ворота приложения', () => {
  it('пока онбординг не пройден, любой экран ведёт на первый шаг', async () => {
    renderAt('/calendar');
    expect(await screen.findByRole('heading', { name: 'Познакомимся!' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Основная навигация' })).not.toBeInTheDocument();
  });

  it('«/onboarding» без шага — первый шаг; неизвестный шаг — тоже', async () => {
    renderAt('/onboarding/9');
    expect(await screen.findByRole('heading', { name: 'Познакомимся!' })).toBeInTheDocument();
  });

  it('ошибка хранилища: понятное сообщение и кнопка «Повторить»', async () => {
    env.failOpen = true;
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Не удалось открыть данные' })).toBeInTheDocument();
    env.failOpen = false;
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { name: 'Познакомимся!' })).toBeInTheDocument();
  });
});

describe('онбординг', () => {
  const next = () => screen.getByRole('button', { name: /^(Далее|Начать тренировки)$/ });

  it('«Далее» заблокирована, пока нет имени', async () => {
    renderAt('/onboarding/1');
    await screen.findByRole('heading', { name: 'Познакомимся!' });
    expect(next()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Имя ребёнка'), '   ');
    expect(next()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Имя ребёнка'), 'Тимур');
    expect(next()).toBeEnabled();
  });

  it('возраст: по умолчанию 8, границы 7–13', async () => {
    renderAt('/onboarding/1');
    expect(await screen.findByText('8 лет')).toBeInTheDocument();
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Уменьшить возраст' }));
    expect(screen.getByText('7 лет')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Уменьшить возраст' })).toBeDisabled();
  });

  it('шаг 2: без домашнего дня идти дальше нельзя; день секции нельзя взять домашним', async () => {
    renderAt('/onboarding/2');
    const home = await screen.findByRole('group', { name: 'Дни тренировок дома' });
    const club = screen.getByRole('group', { name: 'Дни секции' });
    // Вт, Чт, Сб выбраны дома по умолчанию — в группе секции они недоступны.
    expect(within(club).getByRole('button', { name: 'Вторник' })).toBeDisabled();
    for (const day of ['Вторник', 'Четверг', 'Суббота']) {
      await userEvent.click(within(home).getByRole('button', { name: day }));
    }
    expect(screen.getByText('Выбери хотя бы один день дома')).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(within(club).getByRole('button', { name: 'Вторник' })).toBeEnabled();
  });

  it('«Пропустить» на шаге 2 возвращает дни по умолчанию и ведёт на шаг 3', async () => {
    renderAt('/onboarding/2');
    const home = await screen.findByRole('group', { name: 'Дни тренировок дома' });
    await userEvent.click(within(home).getByRole('button', { name: 'Понедельник' }));
    await userEvent.click(screen.getByRole('button', { name: 'Пропустить' }));
    expect(await screen.findByRole('heading', { name: 'Когда начнём?' })).toBeInTheDocument();
  });

  it('шаг 3: пресеты и сетка, прошлые дни недоступны', async () => {
    renderAt('/onboarding/3');
    await screen.findByRole('heading', { name: 'Когда начнём?' });
    expect(screen.getByRole('button', { name: 'Сегодня', pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Завтра' }));
    expect(screen.getByRole('button', { name: 'Завтра', pressed: true })).toBeInTheDocument();
    const past = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('disabled') && /\d+ [а-я]+$/.test(b.getAttribute('aria-label') ?? ''));
    for (const b of past) expect(b).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
  });

  it('PIN вводится дважды; несовпадение сбрасывает ввод', async () => {
    renderAt('/onboarding/4');
    await screen.findByRole('heading', { name: 'Напоминания и код взрослого' });
    const type = async (pin: string) => {
      for (const d of pin) await userEvent.click(screen.getByRole('button', { name: d }));
    };
    await type('1234');
    expect(screen.getByText('Повтори PIN ещё раз')).toBeInTheDocument();
    await type('1235');
    expect(screen.getByRole('alert')).toHaveTextContent('PIN не совпал');
    await type('1234');
    await type('1234');
    expect(screen.getByRole('status')).toHaveTextContent('PIN сохранён');
  });

  it('вернуться назад — черновик сохраняется', async () => {
    renderAt('/onboarding/1');
    await userEvent.type(await screen.findByLabelText('Имя ребёнка'), 'Тимур');
    await userEvent.click(next());
    await userEvent.click(await screen.findByRole('button', { name: 'Назад' }));
    expect(await screen.findByLabelText('Имя ребёнка')).toHaveValue('Тимур');
  });

  it('весь путь: имя → дни → дата → завершение → главная, данные записаны', async () => {
    renderAt('/');
    await userEvent.type(await screen.findByLabelText('Имя ребёнка'), 'Тимур');
    await userEvent.click(next());
    await screen.findByRole('heading', { name: 'Когда тренируемся?' });
    await userEvent.click(next());
    await screen.findByRole('heading', { name: 'Когда начнём?' });
    await userEvent.click(next());
    await screen.findByRole('heading', { name: 'Напоминания и код взрослого' });
    await userEvent.click(next());

    expect(await screen.findByRole('heading', { name: 'Привет, Тимур' })).toBeInTheDocument();
    const repos = createUserDataRepositories(env.db!);
    expect(await repos.profiles.list()).toMatchObject([{ name: 'Тимур', age: 8 }]);
    expect(await repos.schedules.list()).toMatchObject([{ weeks: 12, homeDays: [2, 4, 6], clubDays: [] }]);
    expect((await repos.plannedSessions.list()).length).toBeGreaterThanOrEqual(30);
  });

  it('сбой записи: сообщение об ошибке, остаёмся на шаге 4, повтор работает', async () => {
    renderAt('/onboarding/1');
    await userEvent.type(await screen.findByLabelText('Имя ребёнка'), 'Тимур');
    for (const heading of ['Когда тренируемся?', 'Когда начнём?', 'Напоминания и код взрослого']) {
      await userEvent.click(next());
      await screen.findByRole('heading', { name: heading });
    }
    env.prefs!.preferences.set.mockRejectedValueOnce(new Error('диск полон'));
    await userEvent.click(next());
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    await userEvent.click(next());
    expect(await screen.findByRole('heading', { name: 'Привет, Тимур' })).toBeInTheDocument();
  });
});
