import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { Button } from './Button';

describe('Button', () => {
  it('вызывает onClick и по умолчанию type="button"', async () => {
    const onClick = vi.fn();
    renderUi(<Button onClick={onClick}>Начать</Button>);
    const button = screen.getByRole('button', { name: 'Начать' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('работает с клавиатуры', async () => {
    const onClick = vi.fn();
    renderUi(<Button onClick={onClick}>Начать</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled не кликается', async () => {
    const onClick = vi.fn();
    renderUi(
      <Button disabled onClick={onClick}>
        Начать
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading блокирует кнопку и ставит aria-busy', async () => {
    const onClick = vi.fn();
    renderUi(
      <Button loading onClick={onClick}>
        Сохранить
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Сохранить' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('с `to` рендерится ссылкой', () => {
    renderUi(<Button to="/library">Упражнения</Button>);
    expect(screen.getByRole('link', { name: 'Упражнения' })).toHaveAttribute('href', '/library');
  });

  it('иконка справа скрыта от скринридера', () => {
    renderUi(<Button iconRight={<svg data-testid="icon" />}>Дальше</Button>);
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Дальше' })).toBeInTheDocument();
  });
});
