const CLASS_NAME = 'dev-frame';

/**
 * В режиме разработки на широком экране показываем приложение в рамке телефона (стили — в global.scss),
 * чтобы вёрстка в браузере выглядела как на устройстве. В продакшен-сборке (APK) класс не ставится.
 */
export function applyDevFrame(
  enabled: boolean = import.meta.env.DEV,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle(CLASS_NAME, enabled);
}
