import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import styles from './TabBar.module.scss';

type TabKey = 'home' | 'library' | 'timer' | 'calendar' | 'profile';

const TABS: { key: TabKey; to: string; icon: React.ReactNode }[] = [
  {
    key: 'home',
    to: '/',
    icon: (
      <path
        d="M4 11L12 4L20 11V19A1 1 0 0 1 19 20H14V14H10V20H5A1 1 0 0 1 4 19Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: 'library',
    to: '/library',
    icon: (
      <>
        <path d="M5 4H12V20H5A1 1 0 0 1 4 19V5A1 1 0 0 1 5 4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 4H19A1 1 0 0 1 20 5V19A1 1 0 0 1 19 20H12" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
  {
    key: 'timer',
    to: '/timer',
    icon: (
      <>
        <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9V13L15 15M9 3H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'calendar',
    to: '/calendar',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3V7M16 3V7M4 10H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'profile',
    to: '/profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 20C4 16 7.5 14 12 14C16.5 14 20 16 20 20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {tab.icon}
          </svg>
          <span className={styles.label}>{t(`nav.${tab.key}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
