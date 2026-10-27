import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import fonts from './fonts.ts?raw';

describe('офлайн-шрифты', () => {
  it('index.html не ссылается на внешние шрифты и CDN', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('шрифты Oswald и Manrope подключены из локальных пакетов', () => {
    expect(fonts).toContain('@fontsource/oswald/cyrillic-700.css');
    expect(fonts).toContain('@fontsource/manrope/cyrillic-400.css');
  });
});
