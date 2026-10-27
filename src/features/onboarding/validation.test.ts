import { describe, expect, it } from 'vitest';
import { canProceed, isNameValid, presetDate, NAME_MAX, type Draft } from './validation';

const draft: Draft = {
  name: 'Тимур',
  age: 8,
  clubDays: [],
  homeDays: [2, 4, 6],
  startDate: '2026-11-02',
  remindersEnabled: true,
  pin: null,
};

describe('isNameValid', () => {
  it('непустое имя после обрезки пробелов, не длиннее лимита', () => {
    expect(isNameValid('Тимур')).toBe(true);
    expect(isNameValid('  Тимур  ')).toBe(true);
    expect(isNameValid('')).toBe(false);
    expect(isNameValid('   ')).toBe(false);
    expect(isNameValid('а'.repeat(NAME_MAX))).toBe(true);
    expect(isNameValid('а'.repeat(NAME_MAX + 1))).toBe(false);
  });
});

describe('presetDate', () => {
  it('сегодня, завтра, через неделю — в том числе через границу месяца и года', () => {
    expect(presetDate('today', '2026-11-02')).toBe('2026-11-02');
    expect(presetDate('tomorrow', '2026-11-30')).toBe('2026-12-01');
    expect(presetDate('week', '2026-12-28')).toBe('2027-01-04');
  });
});

describe('canProceed', () => {
  const today = '2026-11-02';

  it('шаг 1: нужно имя и возраст в пределах 7–13', () => {
    expect(canProceed(1, draft, today)).toBe(true);
    expect(canProceed(1, { ...draft, name: ' ' }, today)).toBe(false);
    expect(canProceed(1, { ...draft, age: 6 }, today)).toBe(false);
    expect(canProceed(1, { ...draft, age: 14 }, today)).toBe(false);
  });

  it('шаг 2: нужен хотя бы один домашний день; одних дней секции мало', () => {
    expect(canProceed(2, draft, today)).toBe(true);
    expect(canProceed(2, { ...draft, homeDays: [] }, today)).toBe(false);
    expect(canProceed(2, { ...draft, homeDays: [], clubDays: [2] }, today)).toBe(false);
  });

  it('шаг 3: дата старта не раньше сегодня', () => {
    expect(canProceed(3, draft, today)).toBe(true);
    expect(canProceed(3, { ...draft, startDate: '2026-11-01' }, today)).toBe(false);
    expect(canProceed(3, { ...draft, startDate: '2026-11-03' }, today)).toBe(true);
  });

  it('шаг 4: всегда можно (PIN необязателен)', () => {
    expect(canProceed(4, { ...draft, pin: null }, today)).toBe(true);
  });
});
