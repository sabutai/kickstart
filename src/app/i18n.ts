import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_CONFIG } from '../shared/config/app';
import { ru } from '../shared/i18n/ru';

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru } },
  lng: APP_CONFIG.defaultLang,
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
