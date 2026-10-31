import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { $mode, $profile, modeChanged } from '../../entities/profile/model';
import { $exerciseLevels } from '../../entities/progress/model';
import { streak as streakOf } from '../../entities/schedule/home';
import { $plannedSessions } from '../../entities/schedule/model';
import { useToday } from '../../shared/lib/useToday';
import { LevelPips } from '../../shared/ui/LevelPips/LevelPips';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import { Switch } from '../../shared/ui/Switch/Switch';
import { categoryLevels } from './levels';
import styles from './ProfilePage.module.scss';

/** Профиль (макет «Профиль»): аватар с Киком, итоги, уровни по категориям и переключатель режима взрослого. */
export function ProfilePage() {
  const { t } = useTranslation();
  const today = useToday();
  const [profile, mode, plan, levelOf, changeMode] = useUnit([
    $profile,
    $mode,
    $plannedSessions,
    $exerciseLevels,
    modeChanged,
  ]);

  const done = plan.filter((s) => s.status === 'done').length;
  const streak = streakOf(plan, today);
  const isCoach = mode === 'coach';

  return (
    <main className={styles.screen}>
      <h1 className={styles.heading}>{t('screens.profile')}</h1>
      <div className={styles.avatar} aria-hidden="true">
        <Mascot pose="head" className={styles.avatarKik} />
      </div>
      <div className={styles.who}>
        <p className={styles.name}>{profile?.name}</p>
        {profile && (
          <p className={styles.sub}>
            {t('profile.ageMode', {
              age: profile.age,
              unit: t('ui.yearsUnit', { count: profile.age }),
              mode: t(`mode.${mode}`),
            })}
          </p>
        )}
      </div>

      <div className={styles.summary}>
        <span className={styles.count}>
          {done} <span className={styles.countUnit}>{t('profile.trainings', { count: done })}</span>
        </span>
        <span className={styles.streak}>{t('profile.streak', { count: streak })}</span>
      </div>

      <ul className={styles.levels} aria-label={t('profile.levelsLabel')}>
        {categoryLevels(levelOf).map(({ category, level }) => (
          <li key={category}>
            <Link to={`/library?category=${category}`} className={styles.row}>
              <span className={styles.rowName}>{t(`categories.${category}`)}</span>
              <span className={styles.rowEnd}>
                <LevelPips level={level} />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={styles.chevron}
                >
                  <path
                    d="M9 6L16 12L9 18"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.mode}>
        <Switch
          checked={isCoach}
          onChange={(on) => changeMode(on ? 'coach' : 'child')}
          label={t('profile.coachMode')}
        />
      </div>
    </main>
  );
}
