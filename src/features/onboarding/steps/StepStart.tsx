import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { monthOf, shiftMonth, toDate, toKey } from '../../../shared/lib/dates';
import { useToday } from '../../../shared/lib/useToday';
import { Chip } from '../../../shared/ui/Chip/Chip';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { MonthGrid } from '../../../shared/ui/MonthGrid/MonthGrid';
import { $draft, startDateChanged } from '../model';
import { presetDate, type StartPreset } from '../validation';
import styles from '../Onboarding.module.scss';

const PRESETS: StartPreset[] = ['today', 'tomorrow', 'week'];
const HORIZON_DAYS = 90; // дальше трёх месяцев стартовать не предлагаем

const monthTitle = (month: string) => format(toDate(`${month}-01`), 'LLLL yyyy', { locale: ru });

export function StepStart() {
  const { t } = useTranslation();
  const today = useToday();
  const [draft, setStart] = useUnit([$draft, startDateChanged]);
  const [month, setMonth] = useState(() => monthOf(draft.startDate));
  const minMonth = monthOf(today);
  const maxDate = toKey(addDays(toDate(today), HORIZON_DAYS));
  const maxMonth = monthOf(maxDate);

  const pick = (date: string) => {
    setStart(date);
    setMonth(monthOf(date));
  };

  return (
    <>
      <div>
        <h1 className={styles.headline}>{t('onboarding.step3.headline')}</h1>
        <p className={styles.subcopy}>{t('onboarding.step3.subcopy')}</p>
      </div>
      <div className={styles.presets}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={t(`onboarding.step3.${preset}`)}
            selected={draft.startDate === presetDate(preset, today)}
            onClick={() => pick(presetDate(preset, today))}
          />
        ))}
      </div>
      <div className={styles.section}>
        <div className={styles.monthRow}>
          <IconButton
            label={t('onboarding.step3.prevMonth')}
            disabled={month <= minMonth}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 6L8 12L15 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
          <span className={styles.month} aria-live="polite">
            {monthTitle(month)}
          </span>
          <IconButton
            label={t('onboarding.step3.nextMonth')}
            disabled={month >= maxMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 6L16 12L9 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        </div>
        <MonthGrid
          month={month}
          label={monthTitle(month)}
          today={today}
          selected={draft.startDate}
          minDate={today}
          maxDate={maxDate}
          onSelect={pick}
        />
      </div>
    </>
  );
}
