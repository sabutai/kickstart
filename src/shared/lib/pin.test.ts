import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, verifyPin } from './pin';

describe('isValidPin', () => {
  it('ровно 4 цифры', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
    for (const bad of ['', '123', '12345', 'abcd', '12 4', '12.4', '１２３４'])
      expect(isValidPin(bad)).toBe(false);
  });
});

describe('hashPin / verifyPin', () => {
  it('верный PIN проходит, неверный — нет', async () => {
    const stored = await hashPin('4821');
    expect(await verifyPin('4821', stored)).toBe(true);
    expect(await verifyPin('4822', stored)).toBe(false);
    expect(await verifyPin('', stored)).toBe(false);
  });

  it('PIN в хеше не хранится открытым', async () => {
    const stored = await hashPin('4821');
    expect(stored).not.toContain('4821');
    expect(stored).toMatch(/^v1:[0-9a-f]{32}:[0-9a-f]{64}$/);
  });

  it('соль случайная: один и тот же PIN даёт разные записи, обе проверяются', async () => {
    const [a, b] = [await hashPin('1111'), await hashPin('1111')];
    expect(a).not.toBe(b);
    expect(await verifyPin('1111', a)).toBe(true);
    expect(await verifyPin('1111', b)).toBe(true);
  });

  it('повреждённая или чужая запись не проходит и не падает', async () => {
    for (const bad of ['', 'мусор', 'v2:aa:bb', 'v1:zz:yy', 'v1:abcd']) {
      expect(await verifyPin('1234', bad)).toBe(false);
    }
  });

  it('hashPin отклоняет невалидный PIN', async () => {
    await expect(hashPin('12')).rejects.toThrow();
  });
});
