import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderUi } from '../../../test/render';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('доступное имя берётся из label, клик работает', async () => {
    const onClick = vi.fn();
    renderUi(
      <IconButton label="Назад" onClick={onClick}>
        <svg />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled не кликается', async () => {
    const onClick = vi.fn();
    renderUi(
      <IconButton label="Далее" onClick={onClick} disabled>
        <svg />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('с `to` — ссылка с тем же именем', () => {
    renderUi(
      <IconButton label="Назад" to="/onboarding/1">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole('link', { name: 'Назад' })).toHaveAttribute('href', '/onboarding/1');
  });
});
