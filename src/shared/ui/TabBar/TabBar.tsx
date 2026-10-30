import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import styles from './TabBar.module.scss';

type TabKey = 'home' | 'library' | 'timer' | 'calendar' | 'profile';

// Контуры иконок — из макета (docs/design/KickStart Phone.dc.html).
const TABS: { key: TabKey; to: string; path: string }[] = [
  { key: 'home', to: '/', path: 'M4 11L12 4L20 11V19A1 1 0 0 1 19 20H14V14H10V20H5A1 1 0 0 1 4 19Z' },
  {
    key: 'library',
    to: '/library',
    path: 'M5 4H12V20H5A1 1 0 0 1 4 19V5A1 1 0 0 1 5 4ZM12 4H19A1 1 0 0 1 20 5V19A1 1 0 0 1 19 20H12',
  },
  { key: 'timer', to: '/timer', path: 'M12 21A8 8 0 1 0 12 5A8 8 0 0 0 12 21ZM12 9V13L15 15M9 2H15' },
  {
    key: 'calendar',
    to: '/calendar',
    path: 'M5 5H19A1 1 0 0 1 20 6V20H4V6A1 1 0 0 1 5 5ZM8 3V7M16 3V7M4 10H20',
  },
  {
    key: 'profile',
    to: '/profile',
    path: 'M12 12A4 4 0 1 0 12 4A4 4 0 0 0 12 12ZM4 20C4 16 7.5 14 12 14C16.5 14 20 16 20 20',
  },
];

export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav className={styles.bar} aria-label={t('nav.label')}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={tab.path} />
          </svg>
          <span className={styles.label}>{t(`nav.${tab.key}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
