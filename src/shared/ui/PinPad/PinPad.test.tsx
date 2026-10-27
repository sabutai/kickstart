import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { PinPad } from './PinPad';

function Harness({ error = false }: { error?: boolean }) {
  const [pin, setPin] = useState('');
  return <PinPad value={pin} onChange={setPin} error={error} />;
}

const press = async (...digits: string[]) => {
  for (const d of digits) await userEvent.click(screen.getByRole('button', { name: d }));
};

describe('PinPad', () => {
  it('набирает цифры и показывает прогресс для скринридера', async () => {
    renderUi(<Harness />);
    expect(screen.getByRole('img', { name: 'Введено цифр: 0 из 4' })).toBeInTheDocument();
    await press('1', '2');
    expect(screen.getByRole('img', { name: 'Введено цифр: 2 из 4' })).toBeInTheDocument();
  });

  it('не принимает больше 4 цифр: после четвёртой цифры блокируются', async () => {
    renderUi(<Harness />);
    await press('1', '2', '3', '4');
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('img', { name: 'Введено цифр: 4 из 4' })).toBeInTheDocument();
  });

  it('«Стереть» убирает последнюю цифру; на пустом вводе заблокирована', async () => {
    renderUi(<Harness />);
    expect(screen.getByRole('button', { name: 'Стереть' })).toBeDisabled();
    await press('7', '8');
    await userEvent.click(screen.getByRole('button', { name: 'Стереть' }));
    expect(screen.getByRole('img', { name: 'Введено цифр: 1 из 4' })).toBeInTheDocument();
  });

  it('есть все цифры 0–9', () => {
    renderUi(<Harness />);
    for (const d of '0123456789') expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
  });
});
