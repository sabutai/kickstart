import { useTranslation } from 'react-i18next';
import styles from './DayToggle.module.scss';

/** Дни по ISO: 1 = понедельник … 7 = воскресенье. */
const DAYS = [1, 2, 3, 4, 5, 6, 7];

type Props = {
  selected: number[];
  onToggle: (day: number) => void;
  /** Дни, которые выбрать нельзя (заняты другой группой). */
  disabledDays?: number[];
  /** Название группы для скринридера, например «Дни секции». */
  label: string;
};

/** Семь кнопок-переключателей Пн–Вс. */
export function DayToggle({ selected, onToggle, disabledDays = [], label }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.row} role="group" aria-label={label}>
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          className={selected.includes(day) ? `${styles.day} ${styles.on}` : styles.day}
          aria-pressed={selected.includes(day)}
          aria-label={t(`ui.weekday.${day}.full`)}
          disabled={disabledDays.includes(day)}
          onClick={() => onToggle(day)}
        >
          {t(`ui.weekday.${day}.letter`)}
        </button>
      ))}
    </div>
  );
}
