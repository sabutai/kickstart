import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 5 плана MVP (docs/mvp-plan.md). */
export function TimerPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.timer')}>
      <p>{t('common.comingSoon', { stage: 5 })}</p>
    </Screen>
  );
}
