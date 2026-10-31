import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(await screen.findByRole('table', { name: /\d{4}$/ })).toBeInTheDocument(); // сетка месяца
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
  afterEach(() => vi.useRealTimers()); // тесты с зафиксированной датой не должны влиять на остальные
  const next = () => screen.getByRole('button', { name: /^(Далее|Начать)$/ });
  const nameField = () => screen.findByLabelText('Имя');

  it('«Далее» заблокирована, пока нет имени', async () => {
    renderAt('/onboarding/1');
    await screen.findByRole('heading', { name: 'Познакомимся!' });
    expect(next()).toBeDisabled();
    await userEvent.type(await nameField(), '   ');
    expect(next()).toBeDisabled();
    await userEvent.type(await nameField(), 'Тимур');
    expect(next()).toBeEnabled();
  });

  it('возраст: по умолчанию 8, границы 7–13', async () => {
    renderAt('/onboarding/1');
    const age = within(await screen.findByRole('group', { name: 'Возраст' }));
    expect(age.getByRole('status')).toHaveTextContent('8лет');
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Уменьшить возраст' }));
    expect(age.getByRole('status')).toHaveTextContent('7лет');
    expect(screen.getByRole('button', { name: 'Уменьшить возраст' })).toBeDisabled();
  });

  it('шаг 2: без домашнего дня идти дальше нельзя; день секции нельзя взять домашним', async () => {
    renderAt('/onboarding/2');
    const home = await screen.findByRole('group', { name: 'Дни дома' });
    const club = screen.getByRole('group', { name: 'Дни секции' });
    // Вт, Чт, Сб выбраны дома по умолчанию — в группе секции они недоступны.
    expect(within(club).getByRole('button', { name: 'Вторник' })).toBeDisabled();
    for (const day of ['Вторник', 'Четверг', 'Суббота']) {
      await userEvent.click(within(home).getByRole('button', { name: day }));
    }
    expect(screen.getByRole('alert')).toHaveTextContent('Выбери хотя бы один день дома');
    expect(next()).toBeDisabled();
    expect(within(club).getByRole('button', { name: 'Вторник' })).toBeEnabled();
  });

  it('шаг 2 → шаг 3: «Назад» возвращает, «Далее» ведёт к старту программы', async () => {
    renderAt('/onboarding/2');
    await screen.findByRole('group', { name: 'Дни дома' });
    await userEvent.click(next());
    expect(await screen.findByRole('heading', { name: 'Старт программы' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(await screen.findByRole('heading', { name: 'Когда тренируемся?' })).toBeInTheDocument();
  });

  it('шаг 3: дата старта, «Изменить» открывает пресеты и сетку, прошлые дни недоступны', async () => {
    // Дата зафиксирована: от конца месяца зависит, какой месяц откроется после «Завтра».
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T10:00:00'));
    renderAt('/onboarding/3');
    await screen.findByRole('heading', { name: 'Старт программы' });
    expect(screen.getByText('Первое занятие')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Изменить/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Сегодня' }));
    expect(screen.getByRole('button', { name: 'Сегодня', pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Завтра' }));
    expect(screen.getByRole('button', { name: 'Завтра', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(screen.getByText('Первое занятие')).toBeInTheDocument();
  });

  it('шаг 3: в конце месяца «Завтра» открывает следующий месяц, и назад в него можно вернуться', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-31T10:00:00'));
    renderAt('/onboarding/3');
    await userEvent.click(await screen.findByRole('button', { name: /Изменить/ }));
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Завтра' }));
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '1 ноября' })).toBeEnabled();
  });

  it('шаг 3: напоминания включены по умолчанию и переключаются', async () => {
    renderAt('/onboarding/3');
    const sw = await screen.findByRole('switch', { name: 'Напоминания' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('PIN вводится дважды; несовпадение сбрасывает ввод; задан — строка это показывает', async () => {
    renderAt('/onboarding/3');
    await userEvent.click(await screen.findByRole('button', { name: /PIN для взрослых/ }));
    const type = async (pin: string) => {
      for (const d of pin) await userEvent.click(screen.getByRole('button', { name: d }));
    };
    await type('1234');
    expect(screen.getByText('Повтори PIN ещё раз')).toBeInTheDocument();
    await type('1235');
    expect(screen.getByRole('alert')).toHaveTextContent('PIN не совпал');
    await type('1234');
    await type('1234');
    expect(await screen.findByText(/PIN задан/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Старт программы' })).toBeInTheDocument();
  });

  it('вернуться назад — черновик сохраняется', async () => {
    renderAt('/onboarding/1');
    await userEvent.type(await nameField(), 'Тимур');
    await userEvent.click(next());
    await userEvent.click(await screen.findByRole('button', { name: 'Назад' }));
    expect(await nameField()).toHaveValue('Тимур');
  });

  it('весь путь: имя → дни → старт → главная, данные записаны', async () => {
    renderAt('/');
    await userEvent.type(await nameField(), 'Тимур');
    await userEvent.click(next());
    await screen.findByRole('heading', { name: 'Когда тренируемся?' });
    await userEvent.click(next());
    await screen.findByRole('heading', { name: 'Старт программы' });
    await userEvent.click(next());

    expect(await screen.findByRole('heading', { level: 1, name: /Привет, Тимур/ })).toBeInTheDocument();
    const repos = createUserDataRepositories(env.db!);
    expect(await repos.profiles.list()).toMatchObject([{ name: 'Тимур', age: 8 }]);
    expect(await repos.schedules.list()).toMatchObject([{ weeks: 12, homeDays: [2, 4, 6], clubDays: [] }]);
    expect((await repos.plannedSessions.list()).length).toBeGreaterThanOrEqual(30);
  });

  it('сбой записи: сообщение об ошибке, остаёмся на последнем шаге, повтор работает', async () => {
    renderAt('/onboarding/1');
    await userEvent.type(await nameField(), 'Тимур');
    for (const heading of ['Когда тренируемся?', 'Старт программы']) {
      await userEvent.click(next());
      await screen.findByRole('heading', { name: heading });
    }
    env.prefs!.preferences.set.mockRejectedValueOnce(new Error('диск полон'));
    await userEvent.click(next());
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    await userEvent.click(next());
    expect(await screen.findByRole('heading', { level: 1, name: /Привет, Тимур/ })).toBeInTheDocument();
  });
});
