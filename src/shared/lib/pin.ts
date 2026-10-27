// PIN взрослого: 4 цифры. Это защита от ребёнка, а не от взломщика (10 000 вариантов подбираются
// мгновенно при любом хеше), поэтому схема простая: SHA-256 от соли и PIN, без аккаунтов и восстановления.

const PIN_RE = /^[0-9]{4}$/;
const VERSION = 'v1';

export const isValidPin = (pin: string): boolean => PIN_RE.test(pin);

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function digest(saltHex: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${saltHex}:${pin}`);
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

/** Запись для хранения: `v1:<соль>:<хеш>`. */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new Error('PIN — ровно 4 цифры');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return `${VERSION}:${salt}:${await digest(salt, pin)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [version, salt, hash] = stored.split(':');
  if (version !== VERSION || !salt || !hash || !/^[0-9a-f]+$/.test(salt)) return false;
  return (await digest(salt, pin)) === hash;
}
