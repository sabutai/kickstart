import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { $mode } from '../../entities/profile/model';
import { $plannedSessions } from '../../entities/schedule/model';
import { monthOf, shiftMonth, toDate } from '../../shared/lib/dates';
import { useToday } from '../../shared/lib/useToday';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { MonthGrid } from '../../shared/ui/MonthGrid/MonthGrid';
import { Screen } from '../../shared/ui/Screen/Screen';
import { StatRow } from '../../shared/ui/StatRow/StatRow';
import { DayCard } from './DayCard';
import { rejectionCleared } from './model';
import { dayStatus, monthRange, monthStats } from './stats';
import styles from './CalendarPage.module.scss';

const monthTitle = (month: string) => format(toDate(`${month}-01`), 'LLLL yyyy', { locale: ru });
const clamp = (month: string, first: string, last: string) =>
  month < first ? first : month > last ? last : month;

export function CalendarPage() {
  const { t } = useTranslation();
  const today = useToday();
  const [plan, mode, clearRejection] = useUnit([$plannedSessions, $mode, rejectionCleared]);
  const range = useMemo(() => monthRange(plan, monthOf(today)), [plan, today]);
  const [month, setMonth] = useState(() => clamp(monthOf(today), range.first, range.last));
  const [selected, setSelected] = useState(today);
  const [followId, setFollowId] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(plan.map((s) => [s.date, s])), [plan]);
  const session = byDate.get(selected);

  // Перенесённое занятие меняет дату: выбор переезжает за ним.
  // Перенесённое занятие меняет дату: выбор и месяц переезжают за ним (корректировка state при рендере).
  const followed = followId ? plan.find((s) => s.id === followId) : undefined;
  if (followed && followed.date !== selected) {
    setSelected(followed.date);
    setMonth(monthOf(followed.date));
    setFollowId(null);
  }

  const select = (date: string) => {
    clearRejection();
    setFollowId(null);
    setSelected(date);
  };

  const stats = monthStats(plan, month, today);

  return (
    <Screen title={t('screens.calendar')} background="calendar" pitchLines>
      <div className={styles.monthRow}>
        <IconButton
          size={26}
          variant="plain"
          label={t('calendar.prevMonth')}
          disabled={month <= range.first}
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
        <h2 className={styles.month} aria-live="polite">
          {monthTitle(month)}
        </h2>
        <IconButton
          size={26}
          variant="plain"
          label={t('calendar.nextMonth')}
          disabled={month >= range.last}
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
        selected={selected}
        getStatus={(date) => dayStatus(byDate.get(date))}
        onSelect={select}
      />

      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.swatchDone}`} aria-hidden="true" />
          {t('calendar.legendDone')}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchPlanned}`} aria-hidden="true" />
          {t('calendar.legendPlanned')}
        </li>
      </ul>

      <div className={styles.dayArea} aria-live="polite">
        <DayCard date={selected} today={today} session={session} onMoveRequested={setFollowId} />
      </div>

      {mode === 'coach' && (
        <StatRow
          items={[
            { label: t('calendar.stats.month'), value: String(stats.total) },
            {
              label: t('calendar.stats.done'),
              value: stats.percent === null ? t('calendar.stats.none') : `${stats.percent}%`,
            },
          ]}
        />
      )}
    </Screen>
  );
}
