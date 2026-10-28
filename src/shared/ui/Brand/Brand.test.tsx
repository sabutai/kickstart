import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../../app/i18n';
import { Brand } from './Brand';

describe('Brand', () => {
  it('показывает название; логотип декоративен', () => {
    const { container } = render(<Brand />);
    expect(screen.getByText('КикСтарт')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
