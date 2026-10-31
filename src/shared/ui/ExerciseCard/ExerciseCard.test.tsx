import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderUi } from '../../../test/render';
import { ExerciseCard } from './ExerciseCard';

describe('ExerciseCard', () => {
  const props = {
    title: 'Прыжки фигуриста',
    category: 'Баланс',
    detail: '2 подхода',
    categoryColor: '#4d8cff',
    to: '/exercise/skating-jumps',
    index: 0,
  };

  it('вся плитка — ссылка на упражнение', () => {
    renderUi(<ExerciseCard {...props} />);
    expect(screen.getByRole('link', { name: /Прыжки фигуриста/ })).toHaveAttribute(
      'href',
      '/exercise/skating-jumps',
    );
  });

  it('значок: категория и подробность; доступное имя читается связно', () => {
    renderUi(<ExerciseCard {...props} />);
    const link = screen.getByRole('link');
    expect(within(link).getByText('Баланс · 2 подхода')).toBeInTheDocument();
    expect(link).toHaveAccessibleName('Прыжки фигуриста. Баланс, 2 подхода');
  });

  it('у Кика есть позиционирующий класс варианта (не потерялся при переименовании)', () => {
    const { container } = renderUi(<ExerciseCard {...props} />);
    expect(container.querySelector('img')!.className).toMatch(/kikGreen/);
  });

  it('Кик декоративен', () => {
    const { container } = renderUi(<ExerciseCard {...props} />);
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true');
  });

  it('фон и поза Кика чередуются по номеру в списке', () => {
    const variant = (index: number) => {
      const { container, unmount } = renderUi(<ExerciseCard {...props} index={index} />);
      const link = container.querySelector('a')!;
      const out = [link.className, container.querySelector('img')!.getAttribute('data-pose')];
      unmount();
      return out;
    };
    const first = variant(0);
    expect(variant(4)).toEqual(first); // круг из четырёх
    expect(new Set([0, 1, 2, 3].map((i) => variant(i)[1])).size).toBe(4);
    expect(new Set([0, 1, 2, 3].map((i) => variant(i)[0])).size).toBe(4);
  });
});
