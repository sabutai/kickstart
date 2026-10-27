import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Должно совпадать с src/shared/config/app.ts — проверяет тест src/shared/config/app.test.ts.
  appId: 'ru.kickstart.kids',
  appName: 'KickStart Kids',
  webDir: 'dist',
  android: {
    // Контент приложения полностью офлайн: никаких внешних URL.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0B2A1B',
    },
  },
};

export default config;
