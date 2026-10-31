import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScrollArea } from './ScrollArea';

const fade = (container: HTMLElement) => container.querySelector('[data-scrolled]')!;

function scrollTo(el: HTMLElement, top: number) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: top });
  fireEvent.scroll(el);
}

describe('ScrollArea', () => {
  it('показывает содержимое; размытие у верхнего края скрыто, пока не прокрутили', () => {
    const { container } = render(
      <ScrollArea>
        <p>текст</p>
      </ScrollArea>,
    );
    expect(screen.getByText('текст')).toBeInTheDocument();
    expect(fade(container)).toHaveAttribute('data-scrolled', 'false');
  });

  it('при прокрутке вниз размытие появляется, при возврате наверх — исчезает', () => {
    const { container } = render(
      <ScrollArea>
        <p>текст</p>
      </ScrollArea>,
    );
    const scroller = screen.getByText('текст').parentElement!;
    scrollTo(scroller, 40);
    expect(fade(container)).toHaveAttribute('data-scrolled', 'true');
    scrollTo(scroller, 0);
    expect(fade(container)).toHaveAttribute('data-scrolled', 'false');
  });

  it('дрожание пальца (1–2 px) размытие не включает', () => {
    const { container } = render(
      <ScrollArea>
        <p>текст</p>
      </ScrollArea>,
    );
    scrollTo(screen.getByText('текст').parentElement!, 2);
    expect(fade(container)).toHaveAttribute('data-scrolled', 'false');
  });

  it('кромка декоративна и не перехватывает касания', () => {
    const { container } = render(<ScrollArea>x</ScrollArea>);
    expect(fade(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('передаёт свои классы прокручиваемому блоку', () => {
    render(<ScrollArea className="мой">x</ScrollArea>);
    expect(screen.getByText('x')).toHaveClass('мой');
  });
});
