import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Ошибки и предупреждения React (одинаковые ключи, act, неизвестные пропы) — это баги: тест падает.
let errors: unknown[][] = [];
beforeEach(() => {
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (errors.length > 0) {
    throw new Error(`console.error во время теста: ${errors.map((a) => a.map(String).join(' ')).join('\n')}`);
  }
});
