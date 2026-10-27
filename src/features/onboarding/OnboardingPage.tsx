import { Navigate, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUnit } from 'effector-react';
import { Backdrop } from '../../shared/ui/Screen/Backdrop';
import { Button } from '../../shared/ui/Button/Button';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { StepProgress } from '../../shared/ui/StepProgress/StepProgress';
import { useToday } from '../../shared/lib/useToday';
import { $draft, $finishError, $finishing, daysSkipped, onboardingFinished, startSkipped } from './model';
import { STEPS, canProceed, type Step } from './validation';
import { StepProfile } from './steps/StepProfile';
import { StepDays } from './steps/StepDays';
import { StepStart } from './steps/StepStart';
import { StepFinish } from './steps/StepFinish';
import styles from './Onboarding.module.scss';

const parseStep = (raw: string | undefined): Step | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEPS ? (n as Step) : null;
};

const CONTENT: Record<Step, () => React.JSX.Element> = {
  1: StepProfile,
  2: StepDays,
  3: StepStart,
  4: StepFinish,
};

/** Онбординг: 4 шага по маршруту /onboarding/:step. Черновик живёт в сторе, поэтому «Назад» ничего не теряет. */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const step = parseStep(useParams().step);
  const today = useToday();
  const [draft, finishing, finishError, finish, skipDays, skipStart] = useUnit([
    $draft,
    $finishing,
    $finishError,
    onboardingFinished,
    daysSkipped,
    startSkipped,
  ]);

  if (step === null) return <Navigate to="/onboarding/1" replace />;
  const Content = CONTENT[step];
  const ready = canProceed(step, draft, today);
  const isLast = step === STEPS;

  const next = () => (isLast ? finish() : void navigate(`/onboarding/${step + 1}`));
  const skip = () => {
    if (step === 2) skipDays();
    if (step === 3) skipStart();
    void navigate(`/onboarding/${step + 1}`);
  };

  return (
    <main className={styles.shell}>
      <Backdrop background="onboarding" pitchLines />
      <div className={styles.top}>
        <span className={styles.topSlot}>
          {step > 1 && (
            <IconButton label={t('onboarding.back')} onClick={() => void navigate(-1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 6L8 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          )}
        </span>
        <StepProgress current={step} total={STEPS} />
        <span className={styles.topSlot}>
          {(step === 2 || step === 3) && (
            <button type="button" className={styles.skip} onClick={skip}>
              {t('onboarding.skip')}
            </button>
          )}
        </span>
      </div>

      <div className={styles.body}>
        <Content />
        {isLast && finishError && (
          <p className={styles.error} role="alert">
            {t('onboarding.step4.saveError')}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <Button
          fullWidth
          size="lg"
          disabled={!ready}
          loading={finishing}
          onClick={next}
          iconRight={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L16 12L9 18"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        >
          {t(isLast ? 'onboarding.finish' : 'onboarding.next')}
        </Button>
      </div>
    </main>
  );
}
