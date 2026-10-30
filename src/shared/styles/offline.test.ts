import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import fonts from './fonts.ts?raw';

describe('офлайн-шрифты', () => {
  it('index.html не ссылается на внешние шрифты и CDN', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('шрифт Manrope подключён из локального пакета (кириллица и латиница)', () => {
    expect(fonts).toContain('@fontsource/manrope/cyrillic-400.css');
    expect(fonts).toContain('@fontsource/manrope/latin-800.css');
    expect(fonts).not.toMatch(/oswald/i);
  });
});
