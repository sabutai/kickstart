import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { addDays, startOfISOWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { program } from '../../content';
import { $mode, $profile, modeChanged } from '../../entities/profile/model';
import { homeState, streak as streakOf, type HomeState } from '../../entities/schedule/home';
import { $plannedSessions, sessionDone } from '../../entities/schedule/model';
import { toDate, toKey } from '../../shared/lib/dates';
import { useToday } from '../../shared/lib/useToday';
import { Button } from '../../shared/ui/Button/Button';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import styles from './HomePage.module.scss';

const SESSION_MINUTES = program.session.parts.reduce((sum, part) => sum + part.minutes, 0);

const SUB_KEYS: Record<HomeState['kind'], string> = {
  session: 'home.sub.session',
  club: 'home.sub.club',
  done: 'home.sub.done',
  skipped: 'home.sub.skipped',
  rest: 'home.sub.rest',
  finished: 'home.sub.finished',
};

/** Неделя Пн–Вс текущей даты: у каждого дня точка по статусу занятия. */
function WeekStrip({ today }: { today: string }) {
  const { t } = useTranslation();
  const plan = useUnit($plannedSessions);
  const monday = startOfISOWeek(toDate(today));
  return (
    <ul className={styles.week} aria-label={t('home.weekLabel')}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = toKey(addDays(monday, i));
        const status = plan.find((s) => s.date === date)?.status;
        const isToday = date === today;
        const name = [
          t(`ui.weekday.${i + 1}.full`),
          isToday && t('ui.day.today'),
          status && t(`ui.day.${status}`),
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <li
            key={date}
            className={isToday ? `${styles.day} ${styles.dayToday}` : styles.day}
            aria-label={name}
            aria-current={isToday ? 'date' : undefined}
          >
            <span className={styles.dayLetter} aria-hidden="true">
              {t(`ui.weekday.${i + 1}.letter`)}
            </span>
            <span
              className={[
                styles.dayDot,
                status === 'done' && styles.dayDotDone,
                status === 'planned' && styles.dayDotPlanned,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </ul>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const today = useToday();
  const [plan, profile, mode, changeMode, markDone] = useUnit([
    $plannedSessions,
    $profile,
    $mode,
    modeChanged,
    sessionDone,
  ]);

  const state = homeState(plan, today);
  const streak = streakOf(plan, today);
  const isCoach = mode === 'coach';
  const nextMode = isCoach ? 'child' : 'coach';

  const title =
    state.kind === 'session' || state.kind === 'club'
      ? t(`calendar.kind.${state.session.kind}`)
      : t(`home.cardTitle.${state.kind}`);
  const line =
    state.kind === 'session' && state.session.kind === 'home'
      ? t('home.todayMinutes', { minutes: SESSION_MINUTES })
      : t('home.today');
  const next =
    'next' in state && state.next
      ? t('home.next', { when: format(toDate(state.next.date), 'EEEE, d MMMM', { locale: ru }) })
      : 'next' in state
        ? t('home.noNext')
        : null;

  return (
    <main className={styles.screen}>
      <div className={styles.art} aria-hidden="true">
        <Mascot pose="front" className={styles.kik} />
      </div>

      <div className={styles.content}>
        <div className={styles.top}>
          <button
            type="button"
            className={styles.modeButton}
            aria-label={t('mode.switchLabel', { mode: t(`mode.${mode}`) })}
            onClick={() => changeMode(nextMode)}
          >
            {t(`mode.${mode}`)}
          </button>
          <span className={styles.streak} aria-label={t('home.streak', { count: streak })}>
            {t('home.streakChip', { count: streak })}
          </span>
        </div>

        <h1 className={styles.greeting}>
          {t('home.greeting')} {profile?.name ?? ''}
        </h1>
        <p className={styles.sub}>{t(SUB_KEYS[state.kind])}</p>

        <section className={styles.today} aria-label={t('home.today')}>
          <p className={styles.todayLine}>{line}</p>
          <h2 className={styles.title}>{title}</h2>
          {next && <p className={styles.next}>{next}</p>}
        </section>

        <div className={styles.spacer} />
        <WeekStrip today={today} />
        {state.kind === 'session' && (
          <Button to="/timer" size="lg" fullWidth>
            {t('home.start')}
          </Button>
        )}
        {state.kind === 'club' && (
          <Button size="lg" fullWidth onClick={() => markDone({ id: state.session.id })}>
            {t('home.was')}
          </Button>
        )}
      </div>
    </main>
  );
}
