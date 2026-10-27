import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('показывает заголовок, текст и действие', () => {
    render(
      <EmptyState
        title="Пока пусто"
        text="Упражнений нет"
        action={<button type="button">Обновить</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Пока пусто' })).toBeInTheDocument();
    expect(screen.getByText('Упражнений нет')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument();
  });

  it('текст и действие необязательны; по умолчанию Кик задумался', () => {
    const { container } = render(<EmptyState title="Пусто" />);
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('data-emotion', 'thinking');
  });

  it('передаёт эмоцию маскоту', () => {
    const { container } = render(<EmptyState title="Отдых" mascot="rest" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-emotion', 'rest');
  });
});
