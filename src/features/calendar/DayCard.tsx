import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { program } from '../../content';
import {
  sessionDone,
  sessionMovedToSunday,
  sessionSkipped,
  sessionStatusReset,
} from '../../entities/schedule/model';
import type { PlannedSession } from '../../entities/user-data/schema';
import { isoWeekday, toDate } from '../../shared/lib/dates';
import { Button } from '../../shared/ui/Button/Button';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { $rejection } from './model';
import styles from './CalendarPage.module.scss';

const SESSION_MINUTES = program.session.parts.reduce((sum, part) => sum + part.minutes, 0);

type Props = {
  date: string;
  today: string;
  session: PlannedSession | undefined;
  /** Нажали «Перенести»: страница переведёт выбор на новую дату, когда занятие переедет. */
  onMoveRequested: (sessionId: string) => void;
};

/** Карточка выбранного дня (макет «Календарь»): градиент с Киком, название и действия. */
export function DayCard({ date, today, session, onMoveRequested }: Props) {
  const { t } = useTranslation();
  const [rejection, markDone, skip, reset, moveToSunday] = useUnit([
    $rejection,
    sessionDone,
    sessionSkipped,
    sessionStatusReset,
    sessionMovedToSunday,
  ]);

  const day = toDate(date);
  const dateText = format(day, 'EEEEEE, d MMMM', { locale: ru });
  const label = date === today ? t('calendar.todayCard', { date: dateText }) : dateText;

  const kik = <Mascot pose="three" className={styles.kik} />;

  if (!session) {
    return (
      <section className={styles.dayCard} aria-label={label}>
        {kik}
        <div className={styles.dayText}>
          <div className={styles.cardLabel}>{label}</div>
          <p className={styles.cardMeta}>{t('calendar.noSession')}</p>
        </div>
      </section>
    );
  }

  const { id } = session;
  const isClub = session.kind === 'club';
  const planned = session.status === 'planned';
  const canStart = !isClub && planned && date === today;
  const canMarkWas = isClub && planned && date <= today;
  const canReset = (isClub && session.status !== 'planned') || (!isClub && session.status === 'skipped');
  const canMove = !isClub && planned && isoWeekday(day) === 6;

  return (
    <section className={styles.dayCard} aria-label={label}>
      {kik}
      <div className={styles.dayText}>
        <div className={styles.cardLabel}>{label}</div>
        <div className={styles.cardTitle}>{t(`calendar.kind.${session.kind}`)}</div>
        <p className={styles.cardMeta}>
          {t(`calendar.status.${session.status}`)}
          {session.kind === 'home' && ` · ${t('calendar.minutes', { count: SESSION_MINUTES })}`}
          {session.movedFrom &&
            ` · ${t('calendar.movedFrom', { date: format(toDate(session.movedFrom), 'd MMMM', { locale: ru }) })}`}
        </p>
        <div className={styles.actions}>
          {canStart && (
            <Button to="/timer" size="sm">
              {t('calendar.actions.start')}
            </Button>
          )}
          {canMarkWas && (
            <Button size="sm" onClick={() => markDone({ id })}>
              {t('calendar.actions.was')}
            </Button>
          )}
          {canMove && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onMoveRequested(id);
                moveToSunday({ id });
              }}
            >
              {t('calendar.actions.moveToSunday')}
            </Button>
          )}
          {planned && (
            <Button variant="secondary" size="sm" onClick={() => skip({ id })}>
              {t('calendar.actions.skip')}
            </Button>
          )}
          {canReset && (
            <Button variant="secondary" size="sm" onClick={() => reset({ id })}>
              {t('calendar.actions.reset')}
            </Button>
          )}
        </div>
        {rejection && (
          <p className={styles.rejection} role="alert">
            {t(`calendar.rejected.${rejection}`)}
          </p>
        )}
      </div>
    </section>
  );
}
