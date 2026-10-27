import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Button } from '../shared/ui/Button/Button';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';
import { $appError, $appReady, $onboardingDone, appStarted } from './model';
import styles from './layouts.module.scss';

/**
 * Загружает сохранённые данные при старте и направляет в онбординг, пока он не пройден
 * (и обратно на главную, когда пройден).
 */
export function AppGate() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [ready, error, onboardingDone, start] = useUnit([$appReady, $appError, $onboardingDone, appStarted]);

  useEffect(() => {
    start();
  }, [start]);

  if (error) {
    return (
      <div className={styles.center}>
        <EmptyState
          mascot="thinking"
          title={t('gate.errorTitle')}
          text={t('gate.errorText')}
          action={<Button onClick={() => start()}>{t('gate.retry')}</Button>}
        />
      </div>
    );
  }
  if (!ready) return <div className={styles.center} role="status" aria-label={t('ui.loading')} />;

  const inOnboarding = pathname.startsWith('/onboarding');
  if (!onboardingDone && !inOnboarding) return <Navigate to="/onboarding/1" replace />;
  if (onboardingDone && inOnboarding) return <Navigate to="/" replace />;
  return <Outlet />;
}
