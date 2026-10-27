import { describe, expect, it, vi } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  it('даёт непустые уникальные id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id.length).toBeGreaterThan(8);
  });

  it('работает без crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {});
    try {
      const a = newId();
      const b = newId();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]+-[0-9a-f]{8}-[0-9a-f]{8}$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
