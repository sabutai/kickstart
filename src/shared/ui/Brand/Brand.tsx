import { useTranslation } from 'react-i18next';
import styles from './Brand.module.scss';

/** Логотип-мяч и название приложения (шапка Главной и первый шаг онбординга). */
export function Brand() {
  const { t } = useTranslation();
  return (
    <span className={styles.brand}>
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 7L18 10L16.5 15H11.5L10 10Z" fill="currentColor" />
      </svg>
      <span className={styles.name}>{t('brand.name')}</span>
    </span>
  );
}
