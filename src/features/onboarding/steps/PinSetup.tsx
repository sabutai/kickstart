import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Button } from '../../../shared/ui/Button/Button';
import { PinPad } from '../../../shared/ui/PinPad/PinPad';
import { $draft, pinChosen } from '../model';
import styles from '../Onboarding.module.scss';

const PIN_LENGTH = 4;

/** PIN вводится дважды: восстановления без аккаунтов нет, опечатка заперла бы взрослого. */
export function PinSetup({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [draft, choose] = useUnit([$draft, pinChosen]);
  const [stage, setStage] = useState<'enter' | 'repeat'>('enter');
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
      onClose();
    } else {
      setMismatch(true);
      setValue('');
      setFirst('');
      setStage('enter');
    }
  };

  const reset = () => {
    choose(null);
    onClose();
  };

  return (
    <div className={styles.group}>
      <div>
        <h2 className={styles.headline}>{t('onboarding.step3.pin')}</h2>
        <p className={styles.subcopy}>
          {stage === 'repeat' ? t('onboarding.step3.pinRepeat') : t('onboarding.step3.pinEnter')}
        </p>
      </div>
      {mismatch && (
        <p className={styles.error} role="alert">
          {t('onboarding.step3.pinMismatch')}
        </p>
      )}
      <PinPad value={value} onChange={onChange} length={PIN_LENGTH} error={mismatch} />
      <div className={styles.footer}>
        {draft.pin && (
          <Button variant="mint" onClick={reset}>
            {t('onboarding.step3.pinReset')}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t('onboarding.step3.pinClose')}
        </Button>
      </div>
    </div>
  );
}
