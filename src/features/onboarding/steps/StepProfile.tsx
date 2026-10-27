import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Stepper } from '../../../shared/ui/Stepper/Stepper';
import { TextField } from '../../../shared/ui/TextField/TextField';
import { $draft, ageChanged, nameChanged } from '../model';
import { AGE_MAX, AGE_MIN, NAME_MAX } from '../validation';
import styles from '../Onboarding.module.scss';

export function StepProfile() {
  const { t } = useTranslation();
  const [draft, setName, setAge] = useUnit([$draft, nameChanged, ageChanged]);
  return (
    <>
      <div>
        <h1 className={styles.headline}>{t('onboarding.step1.headline')}</h1>
        <p className={styles.subcopy}>{t('onboarding.step1.subcopy')}</p>
      </div>
      <TextField
        label={t('onboarding.step1.nameLabel')}
        placeholder={t('onboarding.step1.namePlaceholder')}
        value={draft.name}
        onChange={setName}
        maxLength={NAME_MAX}
      />
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t('onboarding.step1.ageLabel')}</span>
        <Stepper
          value={draft.age}
          min={AGE_MIN}
          max={AGE_MAX}
          onChange={setAge}
          decreaseLabel={t('onboarding.step1.ageDecrease')}
          increaseLabel={t('onboarding.step1.ageIncrease')}
          format={(age) => t('ui.years', { count: age })}
          label={t('onboarding.step1.ageLabel')}
        />
      </div>
    </>
  );
}
