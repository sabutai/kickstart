import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { allSettled, fork, type Scope } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router';
import type { Database } from '../../shared/lib/db/types';
import { freshDb } from '../../test/store-env';
import '../../app/i18n';

const env = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  onActive: undefined as ((active: boolean) => void) | undefined,
}));
vi.mock('../../shared/lib/db/open', () => ({ getDb: async () => env.db! }));
vi.mock('../../shared/lib/platform', () => ({
  appLifecycle: {
    onActiveChange: (handler: (active: boolean) => void) => {
      env.onActive = handler;
      return () => {};
    },
    onBackButton: () => () => {},
    exit: () => {},
  },
  haptics: { tap: async () => {} },
  keepAwake: { on: async () => {}, off: async () => {} },
}));

import { getExercise } from '../../content';
import { profileSaved } from '../../entities/profile/model';
import { plannedSessionsSaved, type PlannedSessionInput } from '../../entities/schedule/model';
import type { BuiltSession, SessionItem } from '../../entities/session/build';
import {
  createPlayer,
  reducePlayer,
  type PlayerEvent,
  type PlayerState,
} from '../../entities/session/player';
import { $planId, $player } from './model';
import { TimerPage } from './TimerPage';

const TODAY = '2026-11-03';

const item = (
  id: string,
  partKind: SessionItem['partKind'],
  volume: Partial<SessionItem['volume']> = {},
): SessionItem => ({
  exercise: getExercise(id)!,
  level: 1,
  partKind,
  volume: { sets: 1, workSec: 10, perSide: false, restSec: 0, ...volume },
});
const tiny = (...items: SessionItem[]): BuiltSession => ({
  parts: [...new Set(items.map((i) => i.partKind))],
  items,
});

/** Применяет события к плееру в текущий момент (поддельные часы). */
const play = (state: PlayerState, ...events: PlayerEvent[]) =>
  events.reduce((s, e) => reducePlayer(s, e, Date.now()), state);

const planned = (over: Partial<PlannedSessionInput> = {}): PlannedSessionInput => ({
  id: `ps-${TODAY}`,
  date: TODAY,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  env.db = await freshDb();
  env.onActive = undefined;
});
afterEach(() => vi.useRealTimers());

async function renderTimer(
  opts: { player?: PlayerState; plan?: PlannedSessionInput[]; mode?: 'child' | 'coach' } = {},
): Promise<Scope> {
  const scope = fork({
    values: opts.player
      ? [
          [$player, opts.player],
          [$planId, `ps-${TODAY}`],
        ]
      : [],
  });
  await allSettled(plannedSessionsSaved, { scope, params: opts.plan ?? [planned()] });
  await allSettled(profileSaved, {
    scope,
    params: { name: 'Тимур', age: 8, lang: 'ru', mode: opts.mode ?? 'child' },
  });
  render(
    <Provider value={scope}>
      <MemoryRouter>
        <TimerPage />
      </MemoryRouter>
    </Provider>,
  );
  return scope;
}

const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

describe('до начала занятия', () => {
  it('обзор: части занятия, длительность, предупреждение и «Поехали»', async () => {
    await renderTimer();
    expect(screen.getByRole('heading', { name: 'Тренировка на сегодня' })).toBeInTheDocument();
    expect(screen.getByText('~35 минут · 5 частей')).toBeInTheDocument();
    for (const name of [
      'Игра-разминка',
      'Программа травмопрофилактики',
      'Чувство мяча',
      'Быстрые ноги',
      'Игра и заминка',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByRole('note')).toHaveTextContent('на ковре или матрасе');
    expect(screen.getByRole('button', { name: 'Поехали' })).toBeInTheDocument();
  });

  it('«Поехали» запускает занятие: первая игра и кнопка «Начать»', async () => {
    await renderTimer();
    await userEvent.click(screen.getByRole('button', { name: 'Поехали' }));
    expect(await screen.findByRole('button', { name: 'Начать' })).toBeInTheDocument();
    expect(screen.getByText('Часть 1 из 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Поехали' })).toBeNull();
  });

  it.each([
    ['нет занятия', [], 'Сегодня тренировки нет'],
    ['выполнено', [planned({ status: 'done' })], 'Сегодня уже позанимались'],
    ['секция', [planned({ kind: 'club' })], 'Сегодня секция'],
  ] as const)('сегодня %s — понятное сообщение вместо таймера', async (_name, plan, title) => {
    await renderTimer({ plan: [...plan] });
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Поехали' })).toBeNull();
    expect(screen.getByRole('link', { name: 'К календарю' })).toHaveAttribute('href', '/calendar');
  });
});

describe('вступление и работа на время', () => {
  const plank = () =>
    createPlayer(tiny(item('press-up-plank', 'program', { sets: 2, workSec: 15, restSec: 20 })), Date.now());

  it('вступление: название, объём, исходное положение и «Начать»', async () => {
    await renderTimer({ player: plank() });
    expect(screen.getByRole('heading', { level: 1, name: 'Упор лёжа' })).toBeInTheDocument();
    expect(screen.getByText(/Упор лёжа на прямых руках/)).toBeInTheDocument();
    expect(screen.getAllByRole('definition').map((n) => n.textContent)).toEqual(['2', '15 с', '20 с']);
    await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
    expect(await screen.findByText('Подход 1 из 2')).toBeInTheDocument();
  });

  it('идёт обратный отсчёт, внизу «Далее: Отдых 20 с», ребёнку — поддержка', async () => {
    await renderTimer({ player: play(plank(), { type: 'begin' }) });
    expect(screen.getByRole('timer')).toHaveTextContent('0:15');
    expect(screen.getByText(/Отдых 20 с/)).toBeInTheDocument();
    expect(screen.getByText(/Отлично! Ещё немного!/)).toBeInTheDocument();
    await advance(6_000);
    expect(screen.getByRole('timer')).toHaveTextContent('0:09');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('взрослому поддерживающей строки не показываем', async () => {
    await renderTimer({ player: play(plank(), { type: 'begin' }), mode: 'coach' });
    expect(screen.queryByText(/Отлично! Ещё немного!/)).toBeNull();
  });

  it('по окончании времени — отдых; после отдыха — второй подход; затем оценка техники', async () => {
    await renderTimer({ player: play(plank(), { type: 'begin' }) });
    await advance(15_500);
    expect(screen.getByRole('heading', { level: 1, name: 'Отдых' })).toBeInTheDocument();
    expect(screen.getByText('Перед подходом 2 из 2')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:20');
    await advance(20_000);
    expect(screen.getByText('Подход 2 из 2')).toBeInTheDocument();
    await advance(15_000);
    expect(screen.getByRole('heading', { name: 'Оценка техники' })).toBeInTheDocument();
  });

  it('«Пропустить отдых» сразу возвращает к работе', async () => {
    await renderTimer({ player: play(plank(), { type: 'begin' }, { type: 'skip' }) });
    expect(screen.getByRole('heading', { name: 'Отдых' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Пропустить отдых' }));
    expect(await screen.findByText('Подход 2 из 2')).toBeInTheDocument();
  });

  it('«Дальше» пропускает подход', async () => {
    await renderTimer({ player: play(plank(), { type: 'begin' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
    expect(await screen.findByRole('heading', { name: 'Отдых' })).toBeInTheDocument();
  });
});

describe('повтор демонстрации на экране работы', () => {
  it('кнопка слева от паузы перезапускает видео', async () => {
    const playMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
    const p = play(createPlayer(tiny(item('press-up-plank', 'program', { workSec: 15 })), Date.now()), {
      type: 'begin',
    });
    await renderTimer({ player: p });
    await userEvent.click(screen.getByRole('button', { name: 'Повторить демонстрацию' }));
    expect(playMock).toHaveBeenCalledTimes(1);
    // собственной кнопки плеера на экране работы нет — только эта
    expect(screen.getAllByRole('button', { name: 'Повторить демонстрацию' })).toHaveLength(1);
  });
});

describe('упражнения на повторы и на две стороны', () => {
  it('повторы: число и «Готово», таймера нет', async () => {
    const reps = createPlayer(
      tiny(item('alertness-run', 'program', { sets: 2, reps: 5, workSec: undefined, restSec: 30 })),
      Date.now(),
    );
    await renderTimer({ player: play(reps, { type: 'begin' }) });
    expect(screen.getByText('Повторов: 5')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Пауза' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(await screen.findByRole('heading', { name: 'Отдых' })).toBeInTheDocument();
  });

  it('обе стороны: подпись стороны, «Смени сторону», вторая сторона', async () => {
    const both = createPlayer(
      tiny(
        item('skating-jumps', 'program', {
          sets: 1,
          reps: 5,
          workSec: undefined,
          perSide: true,
          restSec: 30,
        }),
      ),
      Date.now(),
    );
    await renderTimer({ player: play(both, { type: 'begin' }) });
    expect(screen.getByText('Подход 1 из 1 · Первая сторона')).toBeInTheDocument();
    expect(screen.getByText(/Смена стороны/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(await screen.findByRole('heading', { name: 'Смени сторону' })).toBeInTheDocument();
    await advance(5_500);
    expect(screen.getByText('Подход 1 из 1 · Вторая сторона')).toBeInTheDocument();
  });
});

describe('«Приготовься»', () => {
  it('упражнения блока Б стартуют сами после отсчёта', async () => {
    const p = createPlayer(tiny(item('toe-taps', 'ball', { workSec: 30 })), Date.now());
    await renderTimer({ player: p });
    expect(screen.getByRole('heading', { level: 1, name: 'Тычки' })).toBeInTheDocument();
    expect(screen.getByText('Приготовься')).toBeInTheDocument();
    await advance(6_500); // 5 с «Приготовься» + 1,5 с работы: 28,5 с, округляем вверх
    expect(screen.getByText('Подход 1 из 1')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:29');
  });

  it('«Старт» пропускает отсчёт', async () => {
    const p = createPlayer(tiny(item('toe-taps', 'ball', { workSec: 30 })), Date.now());
    await renderTimer({ player: p });
    await userEvent.click(screen.getByRole('button', { name: 'Старт' }));
    expect(await screen.findByText('Подход 1 из 1')).toBeInTheDocument();
  });
});

describe('пауза', () => {
  const working = () =>
    play(createPlayer(tiny(item('press-up-plank', 'program', { workSec: 15 })), Date.now()), {
      type: 'begin',
    });

  it('кнопка «Пауза»: время стоит, «Продолжить» возвращает его', async () => {
    await renderTimer({ player: working() });
    await advance(5_000);
    await userEvent.click(screen.getByRole('button', { name: 'Пауза' }));
    expect(screen.getByRole('alertdialog', { name: 'Пауза' })).toBeInTheDocument();
    await advance(60_000);
    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('timer')).toHaveTextContent('0:10');
  });

  it('свернули приложение — автопауза', async () => {
    await renderTimer({ player: working() });
    expect(env.onActive).toBeDefined();
    await act(async () => env.onActive!(false));
    expect(await screen.findByRole('alertdialog', { name: 'Пауза' })).toBeInTheDocument();
  });

  it('вернулись в приложение — пауза остаётся, пока не нажмут «Продолжить»', async () => {
    await renderTimer({ player: working() });
    await act(async () => env.onActive!(false));
    await act(async () => env.onActive!(true));
    expect(screen.getByRole('alertdialog', { name: 'Пауза' })).toBeInTheDocument();
  });
});

describe('оценка техники', () => {
  const rating = () =>
    play(
      createPlayer(
        tiny(item('spiderman', 'program', { workSec: 10 }), item('toe-taps', 'ball', { workSec: 10 })),
        Date.now(),
      ),
      { type: 'begin' },
      { type: 'skip' },
    );

  it('пять звёзд с понятными названиями; нажатие записывает оценку и идёт дальше', async () => {
    const scope = await renderTimer({ player: rating() });
    const group = screen.getByRole('group', { name: 'Оценка техники' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['1 из 5', '2 из 5', '3 из 5', '4 из 5', '5 из 5']);
    await userEvent.click(within(group).getByRole('button', { name: '4 из 5' }));
    expect(scope.getState($player)?.results[0]?.rating).toBe(4);
    expect(await screen.findByText('Приготовься')).toBeInTheDocument();
  });

  it('«Пропустить» — без оценки', async () => {
    const scope = await renderTimer({ player: rating() });
    await userEvent.click(screen.getByRole('button', { name: 'Пропустить' }));
    expect(scope.getState($player)?.results[0]?.rating).toBeNull();
  });

  it('видна и ребёнку, и взрослому', async () => {
    await renderTimer({ player: rating(), mode: 'child' });
    expect(screen.getByRole('heading', { name: 'Оценка техники' })).toBeInTheDocument();
  });
});

describe('завершение занятия', () => {
  const session = () =>
    tiny(
      item('alertness-run', 'program', { reps: 3, workSec: undefined }),
      item('toe-taps', 'ball', { workSec: 10 }),
    );
  const midProgram = () =>
    play(createPlayer(tiny(item('spiderman', 'program', { workSec: 10 })), Date.now()), { type: 'begin' });
  // Блок А пройден (подход сделан и оценён), идёт «Приготовься» к блоку Б.
  const afterProgram = () =>
    play(
      createPlayer(session(), Date.now()),
      { type: 'begin' },
      { type: 'complete' },
      { type: 'rate', rating: 5 },
    );
  const openDialog = async () =>
    userEvent.click(screen.getAllByRole('button', { name: 'Завершить тренировку' })[0]!);

  it('и крестик, и нижняя ссылка открывают диалог; «Продолжить» возвращает к занятию', async () => {
    await renderTimer({ player: midProgram() });
    expect(screen.getAllByRole('button', { name: 'Завершить тренировку' })).toHaveLength(2);
    await openDialog();
    const dialog = screen.getByRole('dialog', { name: 'Завершить тренировку?' });
    expect(within(dialog).getByRole('button', { name: 'Продолжить' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Продолжить' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('пока диалог открыт, время стоит', async () => {
    await renderTimer({ player: midProgram() });
    await advance(3_000);
    await openDialog();
    await advance(60_000);
    await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.getByRole('timer')).toHaveTextContent('0:07');
  });

  it('пока блок А не пройден, «Засчитать и выйти» недоступна и объяснено почему', async () => {
    await renderTimer({ player: midProgram() });
    await openDialog();
    expect(screen.getByRole('button', { name: 'Засчитать и выйти' })).toBeDisabled();
    expect(screen.getByText(/Засчитать можно после программы травмопрофилактики/)).toBeInTheDocument();
  });

  it('после блока А можно засчитать: итоги и запись в журнал', async () => {
    const scope = await renderTimer({ player: afterProgram() });
    await openDialog();
    expect(screen.getByRole('button', { name: 'Засчитать и выйти' })).toBeEnabled();
    expect(screen.queryByText(/Засчитать можно после/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Засчитать и выйти' }));
    expect(await screen.findByRole('heading', { name: 'Тренировка завершена!' })).toBeInTheDocument();
    expect(scope.getState($player)?.phase).toBe('done');
    await allSettled(scope);
    expect(await env.db!.query('SELECT id FROM session_log')).toHaveLength(1);
  });

  it('«Выйти без записи» возвращает на обзор, журнал пуст, занятие осталось в плане', async () => {
    await renderTimer({ player: midProgram() });
    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Выйти без записи' }));
    expect(await screen.findByRole('heading', { name: 'Тренировка на сегодня' })).toBeInTheDocument();
    expect(await env.db!.query('SELECT id FROM session_log')).toHaveLength(0);
  });
});

describe('итоги', () => {
  it('время, число упражнений и средняя оценка; «На главную» — ссылка на главную', async () => {
    let p = createPlayer(
      tiny(
        item('spiderman', 'program', { workSec: 10 }),
        item('single-leg-hops', 'program', { reps: 3, workSec: undefined }),
      ),
      Date.now(),
    );
    p = play(p, { type: 'begin' });
    await renderTimer({ player: p });
    vi.setSystemTime(new Date(`${TODAY}T10:12:00`));
    p = play(
      p,
      { type: 'tick' },
      { type: 'rate', rating: 5 },
      { type: 'begin' },
      { type: 'complete' },
      { type: 'rate', rating: 4 },
    );
    // Итоговое состояние собираем заново и показываем отдельным рендером.
    document.body.innerHTML = '';
    expect(p.phase).toBe('done');
    await renderTimer({ player: p });
    expect(screen.getByRole('heading', { name: 'Тренировка завершена!' })).toBeInTheDocument();
    expect(screen.getAllByRole('definition').map((n) => n.textContent)).toEqual(['12 мин', '2', '4,5']);
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });

  it('без оценок — прочерк', async () => {
    const p = play(createPlayer(tiny(item('deep-squat', 'cooldown', { workSec: 10 })), Date.now()), {
      type: 'finish',
    });
    await renderTimer({ player: p });
    expect(screen.getAllByRole('definition').map((n) => n.textContent)).toEqual(['1 мин', '0', '—']);
  });

  it('на экране итогов нет кнопки завершения и крестика', async () => {
    const p = play(createPlayer(tiny(item('deep-squat', 'cooldown')), Date.now()), { type: 'finish' });
    await renderTimer({ player: p });
    expect(screen.queryByRole('button', { name: 'Завершить тренировку' })).toBeNull();
  });
});

describe('доступность и уход с экрана', () => {
  it('смена фазы объявляется в области status, а не каждую секунду', async () => {
    const p = createPlayer(tiny(item('press-up-plank', 'program', { workSec: 15 })), Date.now());
    await renderTimer({ player: p });
    expect(screen.getByRole('status')).toHaveTextContent('Упор лёжа. Нажми «Начать»');
    await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
    expect(await screen.findByText('Упор лёжа, подход 1 из 1')).toBeInTheDocument();
    await advance(5_000);
    expect(screen.getByRole('status')).toHaveTextContent('Упор лёжа, подход 1 из 1');
  });

  it('уход с экрана посреди занятия ставит его на паузу', async () => {
    const p = play(createPlayer(tiny(item('press-up-plank', 'program', { workSec: 15 })), Date.now()), {
      type: 'begin',
    });
    const scope = fork({
      values: [
        [$player, p],
        [$planId, `ps-${TODAY}`],
      ],
    });
    const view = render(
      <Provider value={scope}>
        <MemoryRouter>
          <TimerPage />
        </MemoryRouter>
      </Provider>,
    );
    view.unmount();
    await allSettled(scope);
    expect(scope.getState($player)?.pausedAt).not.toBeNull();
  });
});
