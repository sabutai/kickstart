/**
 * Обёртки над нативными плагинами Capacitor.
 * Правило проекта: фичи НЕ импортируют @capacitor/* напрямую — только отсюда.
 * Так приложение запускается и тестируется в обычном браузере, а в тестах
 * этот модуль легко замокать.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { KeepAwake } from '@capacitor-community/keep-awake';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export const haptics = {
  /** Короткая вибрация на смене фазы таймера. В браузере — no-op. */
  async tap(): Promise<void> {
    if (!isNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      /* вибрация не критична */
    }
  },
};

export const keepAwake = {
  async on(): Promise<void> {
    if (!isNative()) return;
    try {
      await KeepAwake.keepAwake();
    } catch {
      /* не критично */
    }
  },
  async off(): Promise<void> {
    if (!isNative()) return;
    try {
      await KeepAwake.allowSleep();
    } catch {
      /* не критично */
    }
  },
};

/** Ключ-значение для настроек. На вебе Preferences сам использует localStorage. */
export const preferences = {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};

type Unsubscribe = () => void;

export const appLifecycle = {
  /** Аппаратная кнопка «Назад» Android. На вебе не вызывается. */
  onBackButton(handler: (canGoBack: boolean) => void): Unsubscribe {
    if (!isNative()) return () => {};
    const sub = App.addListener('backButton', ({ canGoBack }) => handler(canGoBack));
    return () => void sub.then((s) => s.remove());
  },
  /** Уход приложения в фон и возврат (для автопаузы таймера). */
  onActiveChange(handler: (isActive: boolean) => void): Unsubscribe {
    if (!isNative()) {
      const listener = () => handler(document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    }
    const sub = App.addListener('appStateChange', ({ isActive }) => handler(isActive));
    return () => void sub.then((s) => s.remove());
  },
  exit(): void {
    if (isNative()) void App.exitApp();
  },
};

export { openDatabase } from './sqlite';
