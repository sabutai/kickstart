import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderUi } from '../../../test/render';
import { ExerciseCard } from './ExerciseCard';

describe('ExerciseCard', () => {
  const props = {
    title: 'Игра на внимание',
    description: 'Беги и замри по сигналу тренера',
    level: 1,
    levelText: 'Ур. 1',
    badge: '3 подхода',
    categoryColor: '#39e075',
    to: '/exercise/attention-game',
  };

  it('вся карточка — ссылка на упражнение', () => {
    renderUi(<ExerciseCard {...props} />);
    expect(screen.getByRole('link', { name: /Игра на внимание/ })).toHaveAttribute(
      'href',
      '/exercise/attention-game',
    );
  });

  it('показывает описание, подпись уровня, значок и пипсы', () => {
    renderUi(<ExerciseCard {...props} />);
    const link = screen.getByRole('link');
    expect(within(link).getByText('Беги и замри по сигналу тренера')).toBeInTheDocument();
    expect(within(link).getByText('Ур. 1')).toBeInTheDocument();
    expect(within(link).getByText('3 подхода')).toBeInTheDocument();
    expect(within(link).getByRole('img', { name: 'Уровень 1 из 5' })).toBeInTheDocument();
  });

  it('без level пипсов нет; пометка рядом остаётся', () => {
    renderUi(<ExerciseCard {...props} level={undefined} levelText="с 5-й недели" badge="30–45 с" />);
    expect(screen.queryByRole('img', { name: /Уровень/ })).toBeNull();
    expect(screen.getByText('30–45 с')).toBeInTheDocument();
    expect(screen.getByText('с 5-й недели')).toBeInTheDocument();
  });

  it('без level и без пометки строки уровня нет совсем', () => {
    const { container } = renderUi(<ExerciseCard {...props} level={undefined} levelText={undefined} />);
    expect(container.querySelector('.meta')).toBeNull();
  });

  it('превью (Кик, значок, «играть») декоративно и не попадает в доступное имя ссылки', () => {
    renderUi(<ExerciseCard {...props} />);
    const link = screen.getByRole('link');
    expect(link.querySelector('.preview')).toHaveAttribute('aria-hidden', 'true');
    expect(link).not.toHaveAccessibleName(/3 подхода/);
  });
});
