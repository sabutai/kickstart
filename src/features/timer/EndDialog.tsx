import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { programCompleted, type PlayerState } from '../../entities/session/player';
import { Button } from '../../shared/ui/Button/Button';
import { endChosen, endDialogClosed } from './model';
import styles from './Timer.module.scss';

/** Диалог завершения: продолжить, засчитать (после блока А) или выйти без записи. */
export function EndDialog({ player }: { player: PlayerState }) {
  const { t } = useTranslation();
  const [close, choose] = useUnit([endDialogClosed, endChosen]);
  const keepRef = useRef<HTMLButtonElement>(null);
  const canSave = programCompleted(player);

  // Фокус на безопасный вариант: случайное нажатие не должно потерять занятие.
  useEffect(() => keepRef.current?.focus(), []);

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        aria-describedby="end-text"
      >
        <h2 id="end-title" className={styles.title}>
          {t('timer.endDialog.title')}
        </h2>
        <p id="end-text" className={styles.text}>
          {t('timer.endDialog.text')}
        </p>
        <button ref={keepRef} type="button" className={styles.keep} onClick={() => close()}>
          {t('timer.endDialog.keep')}
        </button>
        <Button variant="secondary" fullWidth disabled={!canSave} onClick={() => choose('save')}>
          {t('timer.endDialog.save')}
        </Button>
        {!canSave && <p className={styles.hint}>{t('timer.endDialog.saveHint')}</p>}
        <Button variant="ghost" fullWidth onClick={() => choose('discard')}>
          {t('timer.endDialog.discard')}
        </Button>
      </div>
    </div>
  );
}
