/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, over } from '../../test/contrast';

// ?raw для .scss в Vitest пустой (см. css в vite.config.ts); читаем файл напрямую, путь от корня проекта.
const tokens = readFileSync('src/shared/styles/_tokens.scss', 'utf8');

/** Достаёт `$color-*: #hex` из токенов — тест следит за реальными значениями. */
function token(name: string): string {
  const m = new RegExp(`\\$${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  if (!m?.[1]) throw new Error(`Нет токена ${name}`);
  return m[1];
}

const MIN = 4.5;

describe('контраст текста (WCAG AA, ≥ 4.5:1)', () => {
  const [ink, inkSoft, muted, white] = ['color-ink', 'color-ink-soft', 'color-muted', 'color-white'].map(
    token,
  ) as [string, string, string, string];
  const [bg, field, mint, track] = ['color-bg', 'color-field', 'color-mint', 'color-track'].map(token) as [
    string,
    string,
    string,
    string,
  ];
  const gradFrom = token('color-grad-from');
  const gradAltFrom = token('color-grad-alt-from');
  // Полупрозрачная белая плашка поверх серо-фиолетового фона таймера (худший случай — нижний цвет).
  const pillOnTimer = over(white, 0.75, token('color-timer-to'));

  it.each([
    ['основной текст на фоне', ink, bg],
    ['основной текст на белом', ink, white],
    ['основной текст на плашке «мята»', ink, mint],
    ['основной текст на поле', ink, field],
    ['подпись на фоне', muted, bg],
    ['подпись на белом', muted, white],
    ['подпись на поле (единица «лет»)', muted, field],
    ['подпись на «мяте»', muted, mint],
    ['второй текст на светлом конце градиента', inkSoft, gradFrom],
    ['второй текст на светлом конце зелёного градиента (Главная, отдых)', inkSoft, gradAltFrom],
    ['второй текст на «мяте»', inkSoft, mint],
    ['«Далее: …» на плашке таймера', inkSoft, pillOnTimer],
    ['белый на главной кнопке', white, ink],
    ['белое число на тёмной плашке подхода', white, ink],
    ['светло-зелёный «из 3» на тёмной плашке', track, ink],
    ['неактивный пункт нижнего меню', token('color-muted-decor'), ink],
    ['активный пункт нижнего меню', white, ink],
  ])('%s', (_name, fg, background) => {
    expect(contrast(fg, background)).toBeGreaterThanOrEqual(MIN);
  });

  it('muted-decor на светлом фоне не годится для текста — только декор', () => {
    expect(contrast(token('color-muted-decor'), bg)).toBeLessThan(MIN);
  });

  it('точки и контуры (не текст) различимы: ≥ 3:1', () => {
    for (const [fg, background] of [
      [ink, bg],
      [muted, bg],
      [ink, white],
    ] as const) {
      expect(contrast(fg, background)).toBeGreaterThanOrEqual(3);
    }
  });
});
