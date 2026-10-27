import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { DayToggle } from '../../../shared/ui/DayToggle/DayToggle';
import { $draft, dayToggled } from '../model';
import styles from '../Onboarding.module.scss';

export function StepDays() {
  const { t } = useTranslation();
  const [draft, toggle] = useUnit([$draft, dayToggled]);
  return (
    <>
      <div>
        <h1 className={styles.headline}>{t('onboarding.step2.headline')}</h1>
        <p className={styles.subcopy}>{t('onboarding.step2.subcopy')}</p>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t('onboarding.step2.homeLabel')}</span>
        <DayToggle
          label={t('onboarding.step2.homeLabel')}
          selected={draft.homeDays}
          disabledDays={draft.clubDays}
          onToggle={(day) => toggle({ group: 'home', day })}
        />
        <p className={styles.hint}>
          {draft.homeDays.length === 0 ? t('onboarding.step2.needHome') : t('onboarding.step2.homeHint')}
        </p>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t('onboarding.step2.clubLabel')}</span>
        <DayToggle
          label={t('onboarding.step2.clubLabel')}
          selected={draft.clubDays}
          disabledDays={draft.homeDays}
          onToggle={(day) => toggle({ group: 'club', day })}
        />
        <p className={styles.hint}>{t('onboarding.step2.clubHint')}</p>
      </div>
    </>
  );
}
