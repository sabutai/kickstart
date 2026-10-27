import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { program } from '../../content';
import { CATEGORY_ORDER } from '../../content/selectors';
import { $mode, $profile } from '../../entities/profile/model';
import { homeState, streak as streakOf, weekGoal, type HomeState } from '../../entities/schedule/home';
import { $plannedSessions, sessionDone } from '../../entities/schedule/model';
import type { PlannedSession } from '../../entities/user-data/schema';
import { toDate } from '../../shared/lib/dates';
import { useToday } from '../../shared/lib/useToday';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { Chip } from '../../shared/ui/Chip/Chip';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { ProgressRing } from '../../shared/ui/ProgressRing/ProgressRing';
import { Screen } from '../../shared/ui/Screen/Screen';
import { StatRow } from '../../shared/ui/StatRow/StatRow';
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

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 6L16 12L9 18"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function NextInfo({ next }: { next: PlannedSession | null }) {
  const { t } = useTranslation();
  if (!next) return <p className={styles.meta}>{t('home.noNext')}</p>;
  const when = format(toDate(next.date), 'EEEE, d MMMM', { locale: ru });
  return <p className={styles.meta}>{t('home.next', { when })}</p>;
}

function TodayCard({ state }: { state: HomeState }) {
  const { t } = useTranslation();
  const markDone = useUnit(sessionDone);

  if (state.kind === 'session' || state.kind === 'club') {
    const { session } = state;
    const title = t(`calendar.kind.${session.kind}`);
    return (
      <Card as="section" padding="lg" label={t('home.today')}>
        <div className={styles.label}>{t('home.today')}</div>
        <h2 className={styles.cardTitle}>{title}</h2>
        {session.kind === 'home' && (
          <p className={styles.meta}>{t('calendar.minutes', { count: SESSION_MINUTES })}</p>
        )}
        <div className={styles.cardAction}>
          {state.kind === 'club' ? (
            <Button fullWidth onClick={() => markDone({ id: session.id })}>
              {t('home.was')}
            </Button>
          ) : (
            <Button to="/timer" fullWidth iconRight={ARROW}>
              {t('home.start')}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const mascot = state.kind === 'done' || state.kind === 'finished' ? 'joy' : 'rest';
  return (
    <Card as="section" padding="lg" label={t('home.today')}>
      <div className={styles.restRow}>
        <Mascot emotion={mascot} size={72} />
        <div>
          <div className={styles.label}>{t('home.today')}</div>
          <h2 className={styles.cardTitle}>
            {state.kind === 'done'
              ? t('calendar.status.done')
              : state.kind === 'skipped'
                ? t('calendar.status.skipped')
                : t(SUB_KEYS[state.kind])}
          </h2>
          {'next' in state && <NextInfo next={state.next} />}
        </div>
      </div>
    </Card>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const today = useToday();
  const [plan, profile, mode] = useUnit([$plannedSessions, $profile, $mode]);

  const state = homeState(plan, today);
  const goal = weekGoal(plan, today);
  const streak = streakOf(plan, today);
  const doneTotal = plan.filter((s) => s.status === 'done').length;

  return (
    <Screen
      title={t('home.greeting', { name: profile?.name ?? '' })}
      background="home"
      pitchLines
      header={
        <span className={styles.streak} aria-label={t('home.streak', { count: streak })}>
          <span aria-hidden="true">🔥</span>
          <span aria-hidden="true">{streak}</span>
        </span>
      }
    >
      <p className={styles.sub}>{t(SUB_KEYS[state.kind])}</p>

      <TodayCard state={state} />

      <div className={styles.goal}>
        <ProgressRing value={goal.ratio} label={t('home.goal.label')} size={66}>
          {Math.round(goal.ratio * 100)}%
        </ProgressRing>
        <div>
          <div className={styles.label}>{t('home.goal.label')}</div>
          <div className={styles.goalValue}>
            {goal.total === 0
              ? t('home.goal.empty')
              : t('home.goal.value', { done: goal.done, total: goal.total })}
          </div>
        </div>
      </div>

      <nav className={styles.chips} aria-label={t('home.categoriesTitle')}>
        {CATEGORY_ORDER.map((category) => (
          <Chip
            key={category}
            label={t(`categories.${category}`)}
            dotColor={`var(--cat-${category})`}
            to={`/library?category=${category}`}
          />
        ))}
      </nav>

      {mode === 'coach' && (
        <StatRow
          items={[
            { label: t('home.stats.sessions'), value: String(doneTotal) },
            { label: t('home.stats.streak'), value: String(streak) },
            { label: t('home.stats.goal'), value: goal.total === 0 ? '—' : `${goal.done}/${goal.total}` },
          ]}
        />
      )}
    </Screen>
  );
}
