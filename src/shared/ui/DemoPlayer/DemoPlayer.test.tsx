import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../../app/i18n';
import { DemoPlayer, DemoSoonNote } from './DemoPlayer';

const video = {
  kind: 'video',
  src: 'content/skating-jumps_l1.mp4',
  poster: 'content/skating-jumps_l1.webp',
} as const;
const image = {
  kind: 'image',
  src: 'content/skating-jumps_l3.webp',
  poster: 'content/skating-jumps_l3.webp',
} as const;
const fallback = <p>заглушка</p>;

const play = vi.fn(() => Promise.resolve());

beforeEach(() => {
  play.mockClear();
  // jsdom не реализует воспроизведение медиа.
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
});
afterEach(() => vi.unstubAllGlobals());

const mockReducedMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
  }));

describe('DemoPlayer', () => {
  it('видео: автозапуск без звука по кругу, с постером', () => {
    const { container } = render(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} />);
    const el = container.querySelector('video')!;
    expect(el.autoplay).toBe(true);
    expect(el.muted).toBe(true);
    expect(el.loop).toBe(true);
    expect(el.playsInline).toBe(true);
    expect(el.getAttribute('src')).toContain('content/skating-jumps_l1.mp4');
    expect(el.getAttribute('poster')).toContain('content/skating-jumps_l1.webp');
    expect(screen.getByRole('group', { name: 'Демонстрация: Прыжки' })).toBeInTheDocument();
  });

  it('собственная кнопка «Повторить демонстрацию» — только по запросу; перематывает и запускает', async () => {
    const { container, rerender } = render(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} showReplay />);
    const el = container.querySelector('video')!;
    el.currentTime = 5;
    await userEvent.click(screen.getByRole('button', { name: 'Повторить демонстрацию' }));
    expect(el.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('сигнал повтора снаружи перезапускает видео', () => {
    const { container, rerender } = render(
      <DemoPlayer demo={video} title="П" fallback={fallback} replaySignal={0} />,
    );
    container.querySelector('video')!.currentTime = 4;
    rerender(<DemoPlayer demo={video} title="П" fallback={fallback} replaySignal={1} />);
    expect(play).toHaveBeenCalledTimes(1);
    expect(container.querySelector('video')!.currentTime).toBe(0);
  });

  it('уменьшенное движение: не запускается само, кнопка «Воспроизвести»', async () => {
    mockReducedMotion(true);
    const { container } = render(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} />);
    expect(container.querySelector('video')!.autoplay).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Воспроизвести' }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('нет файла (ошибка загрузки видео) — заглушка вместо пустоты', () => {
    const { container } = render(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} />);
    fireEvent.error(container.querySelector('video')!);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('заглушка')).toBeInTheDocument();
  });

  it('браузер не смог запустить видео — тоже заглушка', async () => {
    play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')));
    const { container } = render(<DemoPlayer demo={video} title="Прыжки" fallback={fallback} showReplay />);
    await userEvent.click(screen.getByRole('button', { name: 'Повторить демонстрацию' }));
    expect(await screen.findByText('заглушка')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('картинка-превью: декоративная <img>; ошибка → заглушка', () => {
    const { container } = render(<DemoPlayer demo={image} title="Прыжки" fallback={fallback} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(screen.queryByRole('button')).toBeNull();
    fireEvent.error(img);
    expect(screen.getByText('заглушка')).toBeInTheDocument();
  });
});

describe('DemoSoonNote', () => {
  it('пометка «скоро появится»', () => {
    render(<DemoSoonNote />);
    expect(screen.getByText('Демонстрация скоро появится')).toBeInTheDocument();
  });
});
