import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Mascot } from './Mascot';
import { KIK_POSES, type KikPose } from './poses';

describe('Mascot', () => {
  it.each<KikPose>(['front', 'three', 'side', 'back', 'head'])(
    'рисует позу %s как декоративную картинку',
    (pose) => {
      const { container } = render(<Mascot pose={pose} />);
      const img = container.querySelector('img')!;
      expect(img).toHaveAttribute('data-pose', pose);
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('aria-hidden', 'true');
      expect(img.getAttribute('src')).toBeTruthy();
    },
  );

  it('разные позы — разные файлы', () => {
    const srcs = (['front', 'three', 'side', 'back', 'head'] as const).map((pose) =>
      render(<Mascot pose={pose} />)
        .container.querySelector('img')!
        .getAttribute('src'),
    );
    expect(new Set(srcs).size).toBe(5);
  });

  it('с alt картинка доступна скринридеру', () => {
    const { container } = render(<Mascot alt="Кик отдыхает" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', 'Кик отдыхает');
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  it('порядок поз для списков — четыре ракурса без «головы»', () => {
    expect(KIK_POSES).toEqual(['three', 'front', 'side', 'back']);
  });
});
