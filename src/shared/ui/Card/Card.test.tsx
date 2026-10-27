import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('рендерит содержимое в div по умолчанию', () => {
    render(<Card>текст</Card>);
    expect(screen.getByText('текст').tagName).toBe('DIV');
  });

  it('секция с label становится областью (region) с именем', () => {
    render(
      <Card as="section" label="Сегодня">
        текст
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Сегодня' })).toBeInTheDocument();
  });

  it('поддерживает семантический тег', () => {
    render(
      <Card as="section" padding="lg">
        текст
      </Card>,
    );
    expect(screen.getByText('текст').tagName).toBe('SECTION');
  });
});
