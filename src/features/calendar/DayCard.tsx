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
import { Card } from '../../shared/ui/Card/Card';
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

/** Карточка выбранного дня: что за занятие и что с ним можно сделать. */
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
  const title = date === today ? t('calendar.today') : format(day, 'EEEE, d MMMM', { locale: ru });

  if (!session) {
    return (
      <Card as="section" padding="lg" label={title}>
        <div className={styles.cardLabel}>{title}</div>
        <p className={styles.cardMeta}>{t('calendar.noSession')}</p>
      </Card>
    );
  }

  const { id } = session;
  const isClub = session.kind === 'club';
  const isHome = !isClub;
  const planned = session.status === 'planned';
  const canStart = isHome && planned && date === today;
  const canMarkWas = isClub && planned && date <= today;
  const canReset = (isClub && session.status !== 'planned') || (isHome && session.status === 'skipped');
  const canMove = isHome && planned && isoWeekday(day) === 6;
  const hasPrimary = canStart || canMarkWas;

  return (
    <Card as="section" padding="lg" label={title}>
      <div className={styles.numeral} aria-hidden="true">
        {day.getDate()}
      </div>
      <div className={styles.cardHead}>
        <div className={styles.cardInfo}>
          <div className={styles.cardLabel}>{title}</div>
          <div className={styles.cardTitle}>{t(`calendar.kind.${session.kind}`)}</div>
          <div className={styles.cardMeta}>
            {t(`calendar.status.${session.status}`)}
            {isHome && session.kind === 'home' && ` · ${t('calendar.minutes', { count: SESSION_MINUTES })}`}
          </div>
          {session.movedFrom && (
            <div className={styles.cardMeta}>
              {t('calendar.movedFrom', { date: format(toDate(session.movedFrom), 'd MMMM', { locale: ru }) })}
            </div>
          )}
        </div>
        {hasPrimary &&
          (canStart ? (
            <Button to="/timer" size="sm">
              {t('calendar.actions.start')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => markDone({ id })}>
              {t('calendar.actions.was')}
            </Button>
          ))}
      </div>

      <div className={styles.actions}>
        {canMove && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              onMoveRequested(id);
              moveToSunday({ id });
            }}
          >
            {t('calendar.actions.moveToSunday')}
          </Button>
        )}
        {planned && (
          <Button variant="ghost" fullWidth onClick={() => skip({ id })}>
            {t('calendar.actions.skip')}
          </Button>
        )}
        {canReset && (
          <Button variant="ghost" fullWidth onClick={() => reset({ id })}>
            {t('calendar.actions.reset')}
          </Button>
        )}
      </div>

      {rejection && (
        <p className={styles.rejection} role="alert">
          {t(`calendar.rejected.${rejection}`)}
        </p>
      )}
    </Card>
  );
}
