import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderUi } from '../../../test/render';
import { LevelPips } from './LevelPips';

describe('LevelPips', () => {
  it('сообщает уровень скринридеру', () => {
    renderUi(<LevelPips level={2} />);
    expect(screen.getByRole('img', { name: 'Уровень 2 из 5' })).toBeInTheDocument();
  });

  it('рисует max полосок, заполнены первые level', () => {
    const { container } = renderUi(<LevelPips level={3} />);
    const pips = container.querySelectorAll('.pip');
    expect(pips).toHaveLength(5);
    expect(container.querySelectorAll('.on')).toHaveLength(3);
  });

  it('обрезает значения вне диапазона', () => {
    const { container, rerender } = renderUi(<LevelPips level={9} />);
    expect(screen.getByRole('img', { name: 'Уровень 5 из 5' })).toBeInTheDocument();
    expect(container.querySelectorAll('.on')).toHaveLength(5);
    rerender(<LevelPips level={-1} />);
    expect(screen.getByRole('img', { name: 'Уровень 0 из 5' })).toBeInTheDocument();
  });

  it('showLabel показывает подпись', () => {
    renderUi(<LevelPips level={2} showLabel />);
    expect(screen.getByText('Уровень 2 из 5')).toBeInTheDocument();
  });
});
