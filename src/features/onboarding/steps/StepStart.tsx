import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { PROGRAM_WEEKS, generateCalendar } from '../../../entities/schedule/calendar';
import { monthOf, shiftMonth, toDate, toKey } from '../../../shared/lib/dates';
import { useToday } from '../../../shared/lib/useToday';
import { Chip } from '../../../shared/ui/Chip/Chip';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { MonthGrid } from '../../../shared/ui/MonthGrid/MonthGrid';
import { Switch } from '../../../shared/ui/Switch/Switch';
import { Button } from '../../../shared/ui/Button/Button';
import { $draft, remindersChanged, startDateChanged } from '../model';
import { presetDate, type StartPreset } from '../validation';
import { PinSetup } from './PinSetup';
import styles from '../Onboarding.module.scss';

const PRESETS: StartPreset[] = ['today', 'tomorrow', 'week'];
const HORIZON_DAYS = 90; // дальше трёх месяцев стартовать не предлагаем

const monthTitle = (month: string) => format(toDate(`${month}-01`), 'LLLL yyyy', { locale: ru });
const CHEVRON_LEFT = 'M15 6L8 12L15 18';
const CHEVRON_RIGHT = 'M9 6L16 12L9 18';

function Chevron({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Выбор даты старта: пресеты и сетка месяца (открывается по «Изменить»). */
function DatePanel({ onClose }: { onClose: () => void }) {
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
    <div className={styles.group}>
      <div className={styles.panelHead}>
        <h2 className={styles.headline}>{t('onboarding.step3.firstSession')}</h2>
        <Button variant="mint" size="sm" onClick={onClose}>
          {t('onboarding.step3.done')}
        </Button>
      </div>
      <div className={styles.presets}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={t(`onboarding.step3.${preset}`)}
            grow
            selected={draft.startDate === presetDate(preset, today)}
            onClick={() => pick(presetDate(preset, today))}
          />
        ))}
      </div>
      <div className={styles.monthRow}>
        <IconButton
          size={30}
          label={t('onboarding.step3.prevMonth')}
          disabled={month <= minMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <Chevron d={CHEVRON_LEFT} />
        </IconButton>
        <span className={styles.month} aria-live="polite">
          {monthTitle(month)}
        </span>
        <IconButton
          size={30}
          label={t('onboarding.step3.nextMonth')}
          disabled={month >= maxMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <Chevron d={CHEVRON_RIGHT} />
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
  );
}

type Panel = 'main' | 'date' | 'pin';

/** Последний шаг: старт программы, напоминания и PIN (макет «Старт программы»). */
export function StepStart() {
  const { t } = useTranslation();
  const [draft, setReminders] = useUnit([$draft, remindersChanged]);
  const [panel, setPanel] = useState<Panel>('main');

  if (panel === 'date') return <DatePanel onClose={() => setPanel('main')} />;
  if (panel === 'pin') return <PinSetup onClose={() => setPanel('main')} />;

  // «Первое занятие» — первое по расписанию, а не дата старта (старт может прийтись на день отдыха).
  const first = generateCalendar({
    startDate: draft.startDate,
    clubDays: draft.clubDays,
    homeDays: draft.homeDays,
    weeks: PROGRAM_WEEKS,
  })[0]?.date;
  const start = format(toDate(first ?? draft.startDate), 'd MMMM, EEEEEE', { locale: ru });
  return (
    <div className={styles.group}>
      <div>
        <h1 className={styles.headline}>{t('onboarding.step3.headline')}</h1>
        <p className={styles.subcopy}>{t('onboarding.step3.subcopy')}</p>
      </div>
      <div className={styles.item}>
        <div>
          <div className={styles.itemSmall}>{t('onboarding.step3.firstSession')}</div>
          <div className={styles.itemValue}>{start}</div>
        </div>
        <button
          type="button"
          className={styles.pill}
          aria-label={`${t('onboarding.step3.change')}: ${t('onboarding.step3.firstSession')}`}
          onClick={() => setPanel('date')}
        >
          {t('onboarding.step3.change')}
        </button>
      </div>
      <div className={styles.item}>
        <Switch
          checked={draft.remindersEnabled}
          onChange={setReminders}
          label={t('onboarding.step3.reminders')}
          description={t('onboarding.step3.remindersHint')}
        />
      </div>
      <button type="button" className={styles.item} onClick={() => setPanel('pin')}>
        <span>
          <div className={styles.itemTitle}>{t('onboarding.step3.pin')}</div>
          <div className={styles.itemHint}>
            {draft.pin ? t('onboarding.step3.pinSet') : t('onboarding.step3.pinHint')}
          </div>
        </span>
        <span className={styles.pinDots} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={draft.pin ? `${styles.pinDot} ${styles.pinDotOn}` : styles.pinDot} />
          ))}
        </span>
      </button>
    </div>
  );
}
