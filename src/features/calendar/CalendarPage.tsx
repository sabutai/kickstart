import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { weekOfDate } from '../../entities/schedule/calendar';
import { $plannedSessions, $schedule } from '../../entities/schedule/model';
import { monthOf, shiftMonth, toDate } from '../../shared/lib/dates';
import { useToday } from '../../shared/lib/useToday';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { MonthGrid } from '../../shared/ui/MonthGrid/MonthGrid';
import { Screen } from '../../shared/ui/Screen/Screen';
import { DayCard } from './DayCard';
import { rejectionCleared } from './model';
import { dayStatus, monthRange } from './stats';
import styles from './CalendarPage.module.scss';

const monthName = (month: string) => {
  const name = format(toDate(`${month}-01`), 'LLLL', { locale: ru });
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const monthLabel = (month: string) => `${monthName(month)} ${month.slice(0, 4)}`;
const clamp = (month: string, first: string, last: string) =>
  month < first ? first : month > last ? last : month;

const ARROW = (d: string) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function CalendarPage() {
  const { t } = useTranslation();
  const today = useToday();
  const [plan, schedule, clearRejection] = useUnit([$plannedSessions, $schedule, rejectionCleared]);
  const range = useMemo(() => monthRange(plan, monthOf(today)), [plan, today]);
  const [month, setMonth] = useState(() => clamp(monthOf(today), range.first, range.last));
  const [selected, setSelected] = useState(today);
  const [followId, setFollowId] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(plan.map((s) => [s.date, s])), [plan]);
  const session = byDate.get(selected);

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

  const weeks = schedule?.weeks;
  const week = schedule && weeks ? Math.min(Math.max(weekOfDate(schedule.startDate, today), 1), weeks) : null;

  return (
    <Screen
      title={monthName(month)}
      aside={
        <div className={styles.aside}>
          {week !== null && weeks !== undefined && (
            <span className={styles.weekOf}>{t('calendar.weekOf', { week, total: weeks })}</span>
          )}
          <IconButton
            size={30}
            variant="plain"
            label={t('calendar.prevMonth')}
            disabled={month <= range.first}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            {ARROW('M15 6L8 12L15 18')}
          </IconButton>
          <IconButton
            size={30}
            variant="plain"
            label={t('calendar.nextMonth')}
            disabled={month >= range.last}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            {ARROW('M9 6L16 12L9 18')}
          </IconButton>
        </div>
      }
    >
      <div className={styles.grid}>
        <MonthGrid
          month={month}
          label={monthLabel(month)}
          today={today}
          selected={selected}
          getStatus={(date) => dayStatus(byDate.get(date))}
          onSelect={select}
        />
      </div>
      <div aria-live="polite">
        <DayCard date={selected} today={today} session={session} onMoveRequested={setFollowId} />
      </div>
    </Screen>
  );
}
