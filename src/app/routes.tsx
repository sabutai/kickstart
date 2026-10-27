import type { RouteObject } from 'react-router';
import { TabLayout, FullscreenLayout } from './layouts';
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
    element: <TabLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'timer', element: <TimerPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    element: <FullscreenLayout />,
    children: [
      { path: 'exercise/:exerciseId', element: <ExercisePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
    ],
  },
];
