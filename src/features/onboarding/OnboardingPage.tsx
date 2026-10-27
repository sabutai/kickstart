import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 3 плана MVP (docs/mvp-plan.md). */
export function OnboardingPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.onboarding')}>
      <p>{t('common.comingSoon', { stage: 3 })}</p>
    </Screen>
  );
}
