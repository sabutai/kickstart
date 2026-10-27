import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';

describe('TextField', () => {
  it('поле связано с подписью', () => {
    render(<TextField label="Имя ребёнка" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Имя ребёнка')).toBeInTheDocument();
  });

  it('сообщает о вводе по символам', async () => {
    const onChange = vi.fn();
    render(<TextField label="Имя" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Имя'), 'Ти');
    expect(onChange).toHaveBeenNthCalledWith(1, 'Т');
    expect(onChange).toHaveBeenNthCalledWith(2, 'и');
  });

  it('уважает maxLength', async () => {
    const Controlled = () => {
      const [v, setV] = useState('');
      return <TextField label="Имя" value={v} onChange={setV} maxLength={3} />;
    };
    render(<Controlled />);
    await userEvent.type(screen.getByLabelText('Имя'), 'Тимур');
    expect(screen.getByLabelText('Имя')).toHaveValue('Тим');
  });

  it('ошибка объявляется и связана с полем', () => {
    render(<TextField label="Имя" value="" onChange={() => {}} error="Введи имя" />);
    const input = screen.getByLabelText('Имя');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Введи имя');
    expect(input).toHaveAccessibleDescription('Введи имя');
  });
});
