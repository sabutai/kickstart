import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Button } from '../../../shared/ui/Button/Button';
import { PinPad } from '../../../shared/ui/PinPad/PinPad';
import { Switch } from '../../../shared/ui/Switch/Switch';
import { $draft, pinChosen, remindersChanged } from '../model';
import styles from '../Onboarding.module.scss';

const PIN_LENGTH = 4;
type PinStage = 'enter' | 'repeat' | 'saved';

/** PIN вводится дважды: восстановления без аккаунтов нет, опечатка заперла бы взрослого. */
function PinSetup() {
  const { t } = useTranslation();
  const [draft, choose] = useUnit([$draft, pinChosen]);
  const [stage, setStage] = useState<PinStage>(draft.pin ? 'saved' : 'enter');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const onChange = (next: string) => {
    setMismatch(false);
    if (next.length < PIN_LENGTH) {
      setValue(next);
      return;
    }
    if (stage === 'enter') {
      setFirst(next);
      setValue('');
      setStage('repeat');
    } else if (next === first) {
      choose(next);
      setValue('');
      setStage('saved');
    } else {
      setMismatch(true);
      setValue('');
      setFirst('');
      setStage('enter');
    }
  };

  const reset = () => {
    choose(null);
    setStage('enter');
    setFirst('');
    setValue('');
    setMismatch(false);
  };

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{t('onboarding.step4.pinLabel')}</span>
      <p className={styles.hint}>
        {stage === 'repeat' ? t('onboarding.step4.pinRepeat') : t('onboarding.step4.pinHint')}
      </p>
      {stage === 'saved' ? (
        <>
          <p className={styles.hint} role="status">
            {t('onboarding.step4.pinSaved')}
          </p>
          <Button variant="secondary" onClick={reset}>
            {t('onboarding.step4.pinRedo')}
          </Button>
        </>
      ) : (
        <>
          {mismatch && (
            <p className={styles.error} role="alert">
              {t('onboarding.step4.pinMismatch')}
            </p>
          )}
          <PinPad value={value} onChange={onChange} length={PIN_LENGTH} error={mismatch} />
          <div className={styles.centerRow}>
            <Button variant="ghost" onClick={reset}>
              {t('onboarding.step4.pinLater')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function StepFinish() {
  const { t } = useTranslation();
  const [draft, setReminders] = useUnit([$draft, remindersChanged]);
  return (
    <>
      <div>
        <h1 className={styles.headline}>{t('onboarding.step4.headline')}</h1>
        <p className={styles.subcopy}>{t('onboarding.step4.subcopy')}</p>
      </div>
      <Switch
        checked={draft.remindersEnabled}
        onChange={setReminders}
        label={t('onboarding.step4.remind')}
        description={t('onboarding.step4.remindTime')}
      />
      <PinSetup />
    </>
  );
}
