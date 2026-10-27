import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

function Harness() {
  const [on, setOn] = useState(false);
  return <Switch checked={on} onChange={setOn} label="Напоминать" description="В 18:00 в дни занятий" />;
}

describe('Switch', () => {
  it('переключается кликом и клавишей Space', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Напоминать' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    sw.focus();
    await userEvent.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('описание привязано к переключателю', () => {
    render(<Harness />);
    expect(screen.getByRole('switch')).toHaveAccessibleDescription('В 18:00 в дни занятий');
  });
});
