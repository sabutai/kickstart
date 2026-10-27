import { Outlet } from 'react-router';
import { TabBar } from '../shared/ui/TabBar/TabBar';
import { useHardwareBack } from './useHardwareBack';
import styles from './layouts.module.scss';

export function TabLayout() {
  useHardwareBack();
  return (
    <div className={styles.shell}>
      <Outlet />
      <TabBar />
    </div>
  );
}

export function FullscreenLayout() {
  useHardwareBack();
  return (
    <div className={styles.shell}>
      <Outlet />
    </div>
  );
}
