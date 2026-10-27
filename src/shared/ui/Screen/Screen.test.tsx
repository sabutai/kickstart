import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Screen } from './Screen';

describe('Screen', () => {
  it('показывает заголовок, слот шапки и содержимое', () => {
    render(
      <Screen title="Главная" header={<span>серия</span>}>
        <p>контент</p>
      </Screen>,
    );
    expect(screen.getByRole('heading', { name: 'Главная' })).toBeInTheDocument();
    expect(screen.getByText('серия')).toBeInTheDocument();
    expect(screen.getByText('контент')).toBeInTheDocument();
  });

  it('без background картинку не рендерит', () => {
    const { container } = render(<Screen title="Т" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('с background рендерит декоративную картинку', () => {
    const { container } = render(<Screen title="Т" background="home" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('backgrounds/bg_home.webp'));
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('при ошибке загрузки убирает картинку и остаётся на фолбэке', () => {
    const { container } = render(<Screen title="Т" background="home" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
  });
});
