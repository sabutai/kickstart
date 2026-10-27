import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 4 плана MVP (docs/mvp-plan.md). */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.home')}>
      <p>{t('common.comingSoon', { stage: 4 })}</p>
    </Screen>
  );
}
