import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 6 плана MVP (docs/mvp-plan.md). */
export function ProfilePage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.profile')} background="profile">
      <p>{t('common.comingSoon', { stage: 6 })}</p>
    </Screen>
  );
}
