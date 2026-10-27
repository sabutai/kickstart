/** Новый идентификатор записи. randomUUID доступен в WebView (secure context); фолбэк — на всякий случай. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const rnd = () => Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  return `${Date.now().toString(16)}-${rnd()}-${rnd()}`;
}
