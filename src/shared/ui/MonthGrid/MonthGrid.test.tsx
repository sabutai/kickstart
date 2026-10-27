import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { MonthGrid, type DayStatus } from './MonthGrid';

const baseProps = { month: '2026-11', label: 'Ноябрь 2026', onSelect: () => {} };

describe('MonthGrid', () => {
  it('заголовки Пн–Вс и все дни месяца кнопками; дни соседних месяцев не нажимаются', () => {
    renderUi(<MonthGrid {...baseProps} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
    expect(screen.getAllByRole('button')).toHaveLength(30); // ноябрь
    expect(screen.getByRole('button', { name: '1 ноября' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 ноября' })).toBeInTheDocument();
  });

  it('выбор дня сообщает дату', async () => {
    const onSelect = vi.fn();
    renderUi(<MonthGrid {...baseProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: '7 ноября' }));
    expect(onSelect).toHaveBeenCalledWith('2026-11-07');
  });

  it('статус и «сегодня» попадают в доступное имя, а не только в цвет', () => {
    const statuses: Record<string, DayStatus> = {
      '2026-11-03': 'done',
      '2026-11-04': 'planned',
      '2026-11-05': 'skipped',
    };
    renderUi(<MonthGrid {...baseProps} today="2026-11-04" getStatus={(d) => statuses[d] ?? 'none'} />);
    expect(screen.getByRole('button', { name: '3 ноября, выполнено' })).toBeInTheDocument();
    const today = screen.getByRole('button', { name: '4 ноября, сегодня, запланировано' });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('button', { name: '5 ноября, пропущено' })).toBeInTheDocument();
  });

  it('выбранный день помечен aria-pressed', () => {
    renderUi(<MonthGrid {...baseProps} selected="2026-11-10" />);
    expect(screen.getByRole('button', { name: '10 ноября' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '11 ноября' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('дни вне диапазона недоступны', async () => {
    const onSelect = vi.fn();
    renderUi(<MonthGrid {...baseProps} onSelect={onSelect} minDate="2026-11-05" maxDate="2026-11-20" />);
    const early = screen.getByRole('button', { name: '4 ноября' });
    expect(early).toBeDisabled();
    expect(screen.getByRole('button', { name: '21 ноября' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '5 ноября' })).toBeEnabled();
    await userEvent.click(early);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('у выполненного дня вместо цифры галочка (имя всё равно содержит дату)', () => {
    renderUi(<MonthGrid {...baseProps} getStatus={(d) => (d === '2026-11-03' ? 'done' : 'none')} />);
    const done = screen.getByRole('button', { name: '3 ноября, выполнено' });
    expect(within(done).queryByText('3')).toBeNull();
    expect(done.querySelector('svg')).not.toBeNull();
  });
});
