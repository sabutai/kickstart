import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderUi } from '../../../test/render';
import { StepProgress } from './StepProgress';

describe('StepProgress', () => {
  it('сообщает номер шага и закрашивает пройденные полоски', () => {
    const { container } = renderUi(<StepProgress current={2} total={4} />);
    expect(screen.getByRole('img', { name: 'Шаг 2 из 4' })).toBeInTheDocument();
    expect(container.querySelectorAll('.bar')).toHaveLength(4);
    expect(container.querySelectorAll('.on')).toHaveLength(2);
  });
});
