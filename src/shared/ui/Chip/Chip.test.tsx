import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { Chip } from './Chip';

describe('Chip', () => {
  it('с onClick — кнопка-переключатель с aria-pressed', async () => {
    const onClick = vi.fn();
    const { rerender } = renderUi(<Chip label="Баланс" onClick={onClick} />);
    const chip = screen.getByRole('button', { name: 'Баланс' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Chip label="Баланс" selected onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Баланс' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('с to — ссылка', () => {
    renderUi(<Chip label="Сила" to="/library" />);
    expect(screen.getByRole('link', { name: 'Сила' })).toHaveAttribute('href', '/library');
  });

  it('без действий — статичная метка', () => {
    renderUi(<Chip label="Ноги" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Ноги')).toBeInTheDocument();
  });

  it('точка категории не попадает в доступное имя', () => {
    const { container } = renderUi(<Chip label="Игры" dotColor="#f2c230" onClick={() => {}} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Игры' })).toBeInTheDocument();
  });
});
