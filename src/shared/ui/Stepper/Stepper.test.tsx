import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stepper } from './Stepper';

function Harness({ start, min = 7, max = 13 }: { start: number; min?: number; max?: number }) {
  const [v, setV] = useState(start);
  return (
    <Stepper
      value={v}
      min={min}
      max={max}
      onChange={setV}
      decreaseLabel="Уменьшить возраст"
      increaseLabel="Увеличить возраст"
      unit="лет"
    />
  );
}

describe('Stepper', () => {
  it('меняет значение кнопками и форматирует его', async () => {
    render(<Harness start={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('лет')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Увеличить возраст' }));
    expect(screen.getByRole('status')).toHaveTextContent('9лет');
    await userEvent.click(screen.getByRole('button', { name: 'Уменьшить возраст' }));
    await userEvent.click(screen.getByRole('button', { name: 'Уменьшить возраст' }));
    expect(screen.getByRole('status')).toHaveTextContent('7лет');
  });

  it('на нижней границе «−» заблокирована, на верхней «+»', async () => {
    const { unmount } = render(<Harness start={7} />);
    expect(screen.getByRole('button', { name: 'Уменьшить возраст' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Увеличить возраст' })).toBeEnabled();
    unmount();
    render(<Harness start={13} />);
    expect(screen.getByRole('button', { name: 'Увеличить возраст' })).toBeDisabled();
  });

  it('значение не выходит за границы', async () => {
    render(<Harness start={13} />);
    await userEvent.click(screen.getByRole('button', { name: 'Увеличить возраст' }));
    expect(screen.getByRole('status')).toHaveTextContent('13лет');
  });
});
