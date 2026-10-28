import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatRow } from './StatRow';

describe('StatRow', () => {
  it('показывает пары «подпись — значение»', () => {
    render(
      <StatRow
        items={[
          { label: 'Тренировок', value: '24' },
          { label: 'Минут', value: '360' },
          { label: 'Серия', value: '12 дн.' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((n) => n.textContent)).toEqual(['Тренировок', 'Минут', 'Серия']);
    expect(screen.getAllByRole('definition').map((n) => n.textContent)).toEqual(['24', '360', '12 дн.']);
  });

  it('пустой список не падает', () => {
    const { container } = render(<StatRow items={[]} />);
    expect(container.querySelectorAll('dt')).toHaveLength(0);
  });

  it('compact — компактные значения', () => {
    const { container } = render(<StatRow compact items={[{ label: 'Подходов', value: '2' }]} />);
    expect(container.querySelector('dl')).toHaveClass('compact');
  });
});
