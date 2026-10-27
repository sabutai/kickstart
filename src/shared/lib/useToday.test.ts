import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToday } from './useToday';

afterEach(() => vi.useRealTimers());

describe('useToday', () => {
  it('возвращает сегодняшнюю дату и обновляется при возврате в приложение после полуночи', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T23:50:00'));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-11-02');

    vi.setSystemTime(new Date('2026-11-03T00:10:00'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-11-03');
  });
});
