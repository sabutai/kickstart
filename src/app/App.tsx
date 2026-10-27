import { useMemo } from 'react';
import { RouterProvider, createHashRouter } from 'react-router';
import { routes } from './routes';
import './i18n';

export function App() {
  const router = useMemo(() => createHashRouter(routes), []);
  return <RouterProvider router={router} />;
}
