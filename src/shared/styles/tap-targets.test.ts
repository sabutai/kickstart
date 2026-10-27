/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// jsdom не считает вёрстку, поэтому проверяем, что у интерактивных компонентов задан min-height: $tap-min.
const read = (name: string) => readFileSync(`src/shared/ui/${name}/${name}.module.scss`, 'utf8');

describe('зоны нажатия ≥ 44 px', () => {
  it('токен $tap-min равен 44px', () => {
    expect(readFileSync('src/shared/styles/_tokens.scss', 'utf8')).toMatch(/\$tap-min:\s*44px/);
  });

  it.each(['Button', 'Chip', 'ExerciseCard', 'TabBar'])('%s задаёт min-height: $tap-min', (name) => {
    expect(read(name)).toMatch(/min-height:\s*\$tap-min/);
  });
});
