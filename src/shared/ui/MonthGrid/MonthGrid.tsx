import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { buildMonthGrid, toDate } from '../../lib/dates';
import styles from './MonthGrid.module.scss';

export type DayStatus = 'none' | 'planned' | 'done' | 'skipped';

type Props = {
  /** Месяц `yyyy-MM`. */
  month: string;
  /** Доступное имя таблицы, например «Ноябрь 2026». */
  label: string;
  today?: string;
  selected?: string;
  /** Дни вне [minDate, maxDate] недоступны (yyyy-MM-dd). */
  minDate?: string;
  maxDate?: string;
  getStatus?: (date: string) => DayStatus;
  onSelect: (date: string) => void;
};

/** Сетка месяца с понедельника. Дни соседних месяцев не нажимаются. */
export function MonthGrid({ month, label, today, selected, minDate, maxDate, getStatus, onSelect }: Props) {
  const { t } = useTranslation();
  const weeks = buildMonthGrid(month);

  return (
    <table className={styles.grid} aria-label={label}>
      <thead>
        <tr>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <th key={d} scope="col" className={styles.weekday} abbr={t(`ui.weekday.${d}.full`)}>
              {t(`ui.weekday.${d}.short`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]!.date}>
            {week.map((cell) => {
              if (!cell.inMonth) {
                return (
                  <td key={cell.date} className={styles.cell}>
                    <span className={`${styles.day} ${styles.outside}`} aria-hidden="true">
                      <span className={styles.disc}>{cell.day}</span>
                    </span>
                  </td>
                );
              }
              const status = getStatus?.(cell.date) ?? 'none';
              const isToday = cell.date === today;
              const outOfRange =
                (minDate !== undefined && cell.date < minDate) ||
                (maxDate !== undefined && cell.date > maxDate);
              const classes = [
                styles.day,
                status !== 'none' && styles[status],
                isToday && styles.today,
                cell.date === selected && styles.selected,
              ]
                .filter(Boolean)
                .join(' ');
              const name = [
                format(toDate(cell.date), 'd MMMM', { locale: ru }),
                isToday && t('ui.day.today'),
                status !== 'none' && t(`ui.day.${status}`),
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <td key={cell.date} className={styles.cell}>
                  <button
                    type="button"
                    className={classes}
                    aria-label={name}
                    aria-pressed={cell.date === selected}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={outOfRange}
                    onClick={() => onSelect(cell.date)}
                  >
                    <span className={styles.disc}>
                      {status === 'done' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M5 13L9.5 17.5L19 7"
                            stroke="currentColor"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        cell.day
                      )}
                    </span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
