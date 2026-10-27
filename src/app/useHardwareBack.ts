import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { appLifecycle } from '../shared/lib/platform';

const EXIT_PATHS = ['/', '/onboarding/1'];

/**
 * Аппаратная «Назад» на Android:
 * на главной и на первом шаге онбординга — выход из приложения, иначе — шаг назад по истории.
 */
export function useHardwareBack(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    return appLifecycle.onBackButton(() => {
      if (EXIT_PATHS.includes(pathname)) {
        appLifecycle.exit();
      } else {
        void navigate(-1);
      }
    });
  }, [navigate, pathname]);
}
