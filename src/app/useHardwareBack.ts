import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { appLifecycle } from '../shared/lib/platform';

/**
 * Аппаратная «Назад» на Android:
 * на главной — выход из приложения, иначе — шаг назад по истории.
 */
export function useHardwareBack(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    return appLifecycle.onBackButton(() => {
      if (pathname === '/') {
        appLifecycle.exit();
      } else {
        void navigate(-1);
      }
    });
  }, [navigate, pathname]);
}
