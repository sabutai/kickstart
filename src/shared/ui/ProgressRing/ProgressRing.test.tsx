import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  it('отдаёт процент через progressbar', () => {
    render(<ProgressRing value={0.75} label="Цель недели" />);
    const bar = screen.getByRole('progressbar', { name: 'Цель недели' });
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('показывает содержимое в центре', () => {
    render(
      <ProgressRing value={0.5} label="Цель">
        50%
      </ProgressRing>,
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('обрезает значения вне 0–1 и NaN', () => {
    const { rerender } = render(<ProgressRing value={2} label="Р" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressRing value={-1} label="Р" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<ProgressRing value={Number.NaN} label="Р" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('смещение дуги соответствует доле', () => {
    const { container } = render(<ProgressRing value={0.25} label="Р" size={66} strokeWidth={7} />);
    const bar = container.querySelector('.bar')!;
    const circumference = 2 * Math.PI * ((66 - 7) / 2);
    expect(Number(bar.getAttribute('stroke-dasharray'))).toBeCloseTo(circumference);
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75);
  });
});
