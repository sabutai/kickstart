import { Navigate, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Button } from '../../shared/ui/Button/Button';
import { Mascot } from '../../shared/ui/Mascot/Mascot';
import type { KikPose } from '../../shared/ui/Mascot/poses';
import { StepProgress } from '../../shared/ui/StepProgress/StepProgress';
import { useToday } from '../../shared/lib/useToday';
import { $draft, $finishError, $finishing, onboardingFinished } from './model';
import { STEPS, canProceed, type Step } from './validation';
import { StepProfile } from './steps/StepProfile';
import { StepDays } from './steps/StepDays';
import { StepStart } from './steps/StepStart';
import styles from './Onboarding.module.scss';

const parseStep = (raw: string | undefined): Step | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEPS ? (n as Step) : null;
};

const CONTENT: Record<Step, () => React.JSX.Element> = { 1: StepProfile, 2: StepDays, 3: StepStart };
// Позы Кика по шагам — как в макете.
const POSE: Record<Step, KikPose> = { 1: 'front', 2: 'three', 3: 'side' };

/** Онбординг: 3 шага по маршруту /onboarding/:step. Черновик живёт в сторе, поэтому «Назад» ничего не теряет. */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const step = parseStep(useParams().step);
  const today = useToday();
  const [draft, finishing, finishError, finish] = useUnit([
    $draft,
    $finishing,
    $finishError,
    onboardingFinished,
  ]);

  if (step === null) return <Navigate to="/onboarding/1" replace />;
  const Content = CONTENT[step];
  const isLast = step === STEPS;
  const ready = canProceed(step, draft, today);
  const next = () => (isLast ? finish() : void navigate(`/onboarding/${step + 1}`));

  return (
    <main className={styles.shell} data-step={step}>
      <div className={styles.hero}>
        <Mascot pose={POSE[step]} className={styles.kik} />
      </div>
      <div className={styles.progress}>
        <StepProgress current={step} total={STEPS} />
      </div>
      <div className={styles.spacer} />
      <section className={styles.sheet}>
        <Content />
        {isLast && finishError && (
          <p className={styles.error} role="alert">
            {t('onboarding.step3.saveError')}
          </p>
        )}
        <div className={styles.footer}>
          {step > 1 && (
            <button
              type="button"
              className={styles.back}
              aria-label={t('onboarding.back')}
              onClick={() => void navigate(-1)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 6L8 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className={styles.next}>
            <Button fullWidth size="lg" disabled={!ready} loading={finishing} onClick={next}>
              {t(isLast ? 'onboarding.finish' : 'onboarding.next')}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
