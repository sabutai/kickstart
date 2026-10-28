import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useUnit } from 'effector-react';
import { $sessionActive, endDialogOpened } from '../features/timer/model';
import { appLifecycle } from '../shared/lib/platform';

const EXIT_PATHS = ['/', '/onboarding/1'];

/**
 * Аппаратная «Назад» на Android:
 * на главной и на первом шаге онбординга — выход из приложения; во время занятия — диалог завершения
 * (случайное «Назад» не должно терять тренировку); иначе — шаг назад по истории.
 */
export function useHardwareBack(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sessionActive, openEndDialog] = useUnit([$sessionActive, endDialogOpened]);

  useEffect(() => {
    return appLifecycle.onBackButton(() => {
      if (pathname === '/timer' && sessionActive) {
        openEndDialog();
      } else if (EXIT_PATHS.includes(pathname)) {
        appLifecycle.exit();
      } else {
        void navigate(-1);
      }
    });
  }, [navigate, pathname, sessionActive, openEndDialog]);
}
