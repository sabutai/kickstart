import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Screen } from './Screen';

describe('Screen', () => {
  it('показывает заголовок, слот справа и содержимое', () => {
    render(
      <Screen title="Календарь" aside={<span>Неделя 1 из 12</span>}>
        <p>контент</p>
      </Screen>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Календарь' })).toBeInTheDocument();
    expect(screen.getByText('Неделя 1 из 12')).toBeInTheDocument();
    expect(screen.getByText('контент')).toBeInTheDocument();
  });

  it('заголовок — в <main>', () => {
    render(<Screen title="Упражнения" />);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  });
});
