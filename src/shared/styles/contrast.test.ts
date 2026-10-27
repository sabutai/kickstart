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
  const ink = token('color-ink');
  const surface = token('color-surface');
  // Карточка: rgba(11,42,27,.75) поверх худшего случая — белой картинки.
  const cardOnWhite = over(ink, 0.75, '#ffffff');

  it.each([
    ['белый на ink', token('color-white'), ink],
    ['белый на surface', token('color-white'), surface],
    ['gray на ink', token('color-gray'), ink],
    ['gray на surface', token('color-gray'), surface],
    ['volt на ink', token('color-volt'), ink],
    ['volt на surface', token('color-volt'), surface],
    ['текст кнопки ребёнка', token('color-accent-child-text'), token('color-accent-child')],
    ['текст кнопки взрослого', token('color-accent-coach-text'), token('color-accent-coach')],
    ['текст выбранного чипа', token('color-chip-selected-text'), token('color-chip-selected')],
    ['белый на карточке поверх белого фона', token('color-white'), cardOnWhite],
  ])('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(MIN);
  });

  it('gray-dim не годится для текста — только декор', () => {
    expect(contrast(token('color-gray-dim'), ink)).toBeLessThan(MIN);
  });
});
