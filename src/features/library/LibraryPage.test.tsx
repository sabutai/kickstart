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
  it('по умолчанию «Все»: все упражнения программы и счётчик', () => {
    renderLibrary();
    expect(cards()).toHaveLength(exercises.length);
    expect(screen.getByText(`Упражнений: ${exercises.length}`)).toBeInTheDocument();
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

  it('карточка: ссылка на упражнение, описание, уровень и подходы', () => {
    renderLibrary('/library?category=balance');
    const card = screen.getByRole('link', { name: /Прыжки конькобежца/ });
    expect(card).toHaveAttribute('href', '/exercise/skating-jumps');
    expect(within(card).getByText(/голеностоп/)).toBeInTheDocument();
    expect(within(card).getByText('Ур. 1')).toBeInTheDocument();
    expect(within(card).getByText('2 подхода')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Уровень 1 из 5' })).toBeInTheDocument();
  });

  it('упражнения с одним уровнем — без пипсов, со временем; с 5-й недели помечены', () => {
    renderLibrary('/library?category=technique');
    const snail = screen.getByRole('link', { name: /Улитка/ });
    expect(within(snail).queryByRole('img', { name: /Уровень/ })).toBeNull();
    expect(within(snail).getByText('30–45 с')).toBeInTheDocument();
    expect(within(snail).getByText('с 5-й недели')).toBeInTheDocument();
  });

  it('все карточки — настоящие ссылки на существующие упражнения', () => {
    renderLibrary();
    const ids = new Set(exercises.map((e) => e.id));
    for (const link of cards()) {
      expect(ids.has(link.getAttribute('href')!.replace('/exercise/', ''))).toBe(true);
    }
  });
});
