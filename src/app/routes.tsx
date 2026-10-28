import { Navigate, type RouteObject } from 'react-router';
import { TabLayout, FullscreenLayout } from './layouts';
import { AppGate } from './AppGate';
import { HomePage } from '../features/home/HomePage';
import { LibraryPage } from '../features/library/LibraryPage';
import { TimerPage } from '../features/timer/TimerPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ExercisePage } from '../features/exercise/ExercisePage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';

/**
 * Маршруты. Хеш-роутер: внутри WebView Capacitor нет сервера для history API.
 * Табы — внутри TabLayout (с нижней навигацией), остальное — полноэкранно.
 */
export const routes: RouteObject[] = [
  {
    // Ворота: загрузка данных и перенаправление в онбординг/на главную.
    element: <AppGate />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'library', element: <LibraryPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
      {
        element: <FullscreenLayout />,
        children: [
          // Таймер — без таб-бара, как в макете: во время занятия ничто не должно отвлекать.
          { path: 'timer', element: <TimerPage /> },
          { path: 'exercise/:exerciseId', element: <ExercisePage /> },
          { path: 'onboarding', element: <Navigate to="/onboarding/1" replace /> },
          { path: 'onboarding/:step', element: <OnboardingPage /> },
        ],
      },
    ],
  },
];
