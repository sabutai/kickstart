import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 4 плана MVP (docs/mvp-plan.md). */
export function ExercisePage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.exercise')}>
      <p>{t('common.comingSoon', { stage: 4 })}</p>
    </Screen>
  );
}
