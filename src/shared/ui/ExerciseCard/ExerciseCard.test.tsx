import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderUi } from '../../../test/render';
import { ExerciseCard } from './ExerciseCard';

describe('ExerciseCard', () => {
  const props = {
    title: 'Игра на внимание',
    description: 'Беги и замри по сигналу тренера',
    level: 1,
    durationMin: 5,
    categoryColor: '#39e075',
    to: '/exercise/attention-game',
  };

  it('вся карточка — ссылка на упражнение', () => {
    renderUi(<ExerciseCard {...props} />);
    const link = screen.getByRole('link', { name: /Игра на внимание/ });
    expect(link).toHaveAttribute('href', '/exercise/attention-game');
  });

  it('показывает описание, уровень и длительность', () => {
    renderUi(<ExerciseCard {...props} />);
    expect(screen.getByText('Беги и замри по сигналу тренера')).toBeInTheDocument();
    expect(screen.getByText('Ур. 1 · 5 мин')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Уровень 1 из 5' })).toBeInTheDocument();
  });

  it('рендерит превью, если оно передано', () => {
    renderUi(<ExerciseCard {...props} thumb={<img alt="" data-testid="thumb" />} />);
    expect(screen.getByTestId('thumb')).toBeInTheDocument();
  });
});
