import { describe, expect, it } from 'vitest';
import capacitorConfig from '../../../capacitor.config';
import { APP_CONFIG } from './app';

describe('конфиг приложения', () => {
  it('appId и имя в capacitor.config.ts совпадают с APP_CONFIG', () => {
    expect(capacitorConfig.appId).toBe(APP_CONFIG.appId);
    expect(capacitorConfig.appName).toBe(APP_CONFIG.appName);
  });
});
