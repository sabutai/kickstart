import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Mascot, type MascotEmotion } from './Mascot';

describe('Mascot', () => {
  it.each<MascotEmotion>(['joy', 'rest', 'thinking'])('рисует эмоцию %s как декоративную', (emotion) => {
    const { container } = render(<Mascot emotion={emotion} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-emotion', emotion);
  });

  it('эмоции различаются по разметке', () => {
    const html = (e: MascotEmotion) => render(<Mascot emotion={e} />).container.innerHTML;
    expect(new Set([html('joy'), html('rest'), html('thinking')]).size).toBe(3);
  });
});
