import { useTranslation } from 'react-i18next';
import { Screen } from '../../shared/ui/Screen/Screen';

/** Заглушка экрана. Реализация — этап 4 плана MVP (docs/mvp-plan.md). */
export function LibraryPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('screens.library')}>
      <p>{t('common.comingSoon', { stage: 4 })}</p>
    </Screen>
  );
}
