import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { routes } from './routes';
import './i18n';

vi.mock('../shared/lib/platform', () => ({
  appLifecycle: { onBackButton: () => () => {}, exit: vi.fn() },
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('каркас приложения', () => {
  it('открывает главную с нижней навигацией из 5 табов', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Главная' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(nav.querySelectorAll('a')).toHaveLength(5);
  });

  it('переключает табы', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Календарь' }));
    expect(screen.getByRole('heading', { name: 'Календарь' })).toBeInTheDocument();
  });

  it('полноэкранные экраны открываются без таб-бара', () => {
    renderAt('/exercise/skating-jumps');
    expect(screen.getByRole('heading', { name: 'Упражнение' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
