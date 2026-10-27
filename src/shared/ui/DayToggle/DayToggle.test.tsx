import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { DayToggle } from './DayToggle';

describe('DayToggle', () => {
  it('семь кнопок с полными названиями дней и aria-pressed', () => {
    renderUi(<DayToggle label="Дни дома" selected={[2, 4]} onToggle={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Вторник' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Среда' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: 'Дни дома' })).toBeInTheDocument();
  });

  it('клик сообщает номер дня по ISO', async () => {
    const onToggle = vi.fn();
    renderUi(<DayToggle label="Дни" selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Воскресенье' }));
    expect(onToggle).toHaveBeenCalledWith(7);
  });

  it('занятые другой группой дни недоступны', async () => {
    const onToggle = vi.fn();
    renderUi(<DayToggle label="Дни" selected={[]} disabledDays={[3]} onToggle={onToggle} />);
    const wed = screen.getByRole('button', { name: 'Среда' });
    expect(wed).toBeDisabled();
    await userEvent.click(wed);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
