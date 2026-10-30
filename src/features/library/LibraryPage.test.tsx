import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter, useLocation } from 'react-router';
import '../../app/i18n';
import { exercises } from '../../content';
import { LibraryPage } from './LibraryPage';

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

function renderLibrary(url = '/library') {
  render(
    <Provider value={fork()}>
      <MemoryRouter initialEntries={[url]}>
        <LibraryPage />
        <Where />
      </MemoryRouter>
    </Provider>,
  );
}

const cards = () => within(screen.getByRole('list')).getAllByRole('link');
const where = () => screen.getByTestId('where').textContent;

describe('библиотека', () => {
  it('по умолчанию «Все»: все упражнения программы', () => {
    renderLibrary();
    expect(cards()).toHaveLength(exercises.length);
    expect(screen.getByRole('button', { name: 'Все', pressed: true })).toBeInTheDocument();
  });

  it('есть чипы всех 6 категорий и «Все»', () => {
    renderLibrary();
    const group = screen.getByRole('group', { name: 'Категории упражнений' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Все', 'Разминка', 'Баланс', 'Сила', 'Техника', 'Игры', 'Мобильность']);
  });

  it('фильтр по категории сужает список и пишется в адрес', async () => {
    renderLibrary();
    await userEvent.click(screen.getByRole('button', { name: 'Баланс' }));
    expect(cards()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Баланс', pressed: true })).toBeInTheDocument();
    expect(where()).toBe('/library?category=balance');
    expect(screen.getByRole('link', { name: /Прыжки конькобежца/ })).toBeInTheDocument();
  });

  it('«Все» сбрасывает фильтр и чистит адрес', async () => {
    renderLibrary('/library?category=strength');
    expect(cards()).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Все' }));
    expect(cards()).toHaveLength(exercises.length);
    expect(where()).toBe('/library');
  });

  it('открывается сразу с фильтром из ссылки (с главной)', () => {
    renderLibrary('/library?category=mobility');
    expect(cards()).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Мобильность', pressed: true })).toBeInTheDocument();
  });

  it('мусор в адресе — «Все», а не пустой экран', () => {
    renderLibrary('/library?category=cardio');
    expect(cards()).toHaveLength(exercises.length);
    expect(screen.getByRole('button', { name: 'Все', pressed: true })).toBeInTheDocument();
  });

  it('карточка: ссылка на упражнение, категория и число подходов, название', () => {
    renderLibrary('/library?category=balance');
    const card = screen.getByRole('link', { name: /Прыжки конькобежца/ });
    expect(card).toHaveAttribute('href', '/exercise/skating-jumps');
    expect(within(card).getByText('Баланс · 2 подхода')).toBeInTheDocument();
    expect(within(card).getByText('Прыжки конькобежца')).toBeInTheDocument();
  });

  it('упражнения с одним уровнем: время работы; открывающиеся позже — с пометкой недели', () => {
    renderLibrary('/library?category=technique');
    const snail = screen.getByRole('link', { name: /Улитка/ });
    expect(within(snail).getByText('Техника · 30–45 сек · с 5-й недели')).toBeInTheDocument();
    const toe = screen.getByRole('link', { name: /Тычки/ });
    expect(within(toe).getByText('Техника · 30–45 сек')).toBeInTheDocument();
  });

  it('все карточки — настоящие ссылки на существующие упражнения', () => {
    renderLibrary();
    const ids = new Set(exercises.map((e) => e.id));
    for (const link of cards()) {
      expect(ids.has(link.getAttribute('href')!.replace('/exercise/', ''))).toBe(true);
    }
  });
});
