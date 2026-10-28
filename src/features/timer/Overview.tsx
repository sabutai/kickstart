import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { program } from '../../content';
import { homeState } from '../../entities/schedule/home';
import { $plannedSessions } from '../../entities/schedule/model';
import { useToday } from '../../shared/lib/useToday';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Screen } from '../../shared/ui/Screen/Screen';
import { startRequested } from './model';
import styles from './Timer.module.scss';

const TOTAL_MINUTES = program.session.parts.reduce((sum, part) => sum + part.minutes, 0);

/** Экран до начала занятия: что нас ждёт и «Поехали»; если занятия на сегодня нет — понятное объяснение. */
export function Overview() {
  const { t } = useTranslation();
  const today = useToday();
  const [plan, start] = useUnit([$plannedSessions, startRequested]);
  const state = homeState(plan, today);

  if (state.kind !== 'session') {
    const key = state.kind === 'done' || state.kind === 'club' ? state.kind : 'rest';
    return (
      <Screen title={t('screens.timer')} background="timer" pitchLines>
        <EmptyState
          mascot={key === 'done' ? 'joy' : 'rest'}
          title={t(`timer.none.${key}`)}
          text={t(`timer.none.${key}Text`)}
          action={
            <Button to="/calendar" variant="secondary">
              {t('timer.none.toCalendar')}
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen title={t('timer.overview.title')} background="timer" pitchLines>
      <p className={styles.subtitle}>
        {t('timer.overview.subtitle', { minutes: TOTAL_MINUTES, parts: program.session.parts.length })}
      </p>
      <Card as="section" padding="lg" label={t('timer.overview.partsLabel')}>
        <h2 className={styles.sectionTitle}>{t('timer.overview.partsLabel')}</h2>
        <ol className={styles.parts}>
          {program.session.parts.map((part, i) => (
            <li key={part.kind} className={styles.partRow}>
              <span className={styles.partNumber} aria-hidden="true">
                {i + 1}
              </span>
              <span className={styles.partName}>{t(`timer.parts.${part.kind}`)}</span>
              <span className={styles.partMinutes}>{t('calendar.minutes', { count: part.minutes })}</span>
            </li>
          ))}
        </ol>
      </Card>
      <p className={styles.safety} role="note">
        {t('exercise.safetyMat')}
      </p>
      <Button size="lg" fullWidth onClick={() => start()}>
        {t('timer.overview.go')}
      </Button>
    </Screen>
  );
}
