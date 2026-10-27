/** Контраст по WCAG 2.1: отношение относительных яркостей двух цветов. */
export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Не hex-цвет: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(parseHex(fg)), luminance(parseHex(bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Смешивает полупрозрачный цвет с фоном (alpha 0–1). */
export function over(fg: string, alpha: number, bg: string): string {
  const [f, b] = [parseHex(fg), parseHex(bg)];
  const mix = f.map((v, i) => Math.round(v * alpha + b[i]! * (1 - alpha)));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
