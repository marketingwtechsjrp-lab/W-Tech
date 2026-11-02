import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import QuestionStep, { type AnswerUpdate } from '../components/survey/QuestionStep';
import { SurveyIntro, SurveyThanks } from '../components/survey/SurveyScreens';
import {
  findSurvey,
  MAX_NAME_LENGTH,
  SECTION_LABELS,
  type SurveyAnswers,
  type SurveySection,
} from '../lib/surveys';

type Phase = 'intro' | 'questions' | 'done';

const AUTO_ADVANCE_MS = 320;

// Accent per section: W-Tech red, LIQUI MOLY blue, W-Tech gold for the closing questions.
const SECTION_THEME: Record<SurveySection, CSSProperties> = {
  course: {
    '--accent': '#E60000',
    '--accent-soft': '#FF6B6B',
    '--accent-tint': 'rgba(230, 0, 0, 0.14)',
    '--accent-ink': '#FFFFFF',
  } as CSSProperties,
  brand: {
    '--accent': '#2F6FDE',
    '--accent-soft': '#8DB4FF',
    '--accent-tint': 'rgba(47, 111, 222, 0.16)',
    '--accent-ink': '#FFFFFF',
  } as CSSProperties,
  next: {
    '--accent': '#D4AF37',
    '--accent-soft': '#E9CF7A',
    '--accent-tint': 'rgba(212, 175, 55, 0.14)',
    '--accent-ink': '#111111',
  } as CSSProperties,
};

const GLOW: Record<SurveySection, string> = {
  course: 'rgba(230, 0, 0, 0.55)',
  brand: 'rgba(47, 111, 222, 0.55)',
  next: 'rgba(212, 175, 55, 0.45)',
};

const doneKey = (slug: string) => `wtech_survey_done_${slug}`;

function readDone(slug: string): boolean {
  try {
    return localStorage.getItem(doneKey(slug)) === '1';
  } catch {
    return false;
  }
}

function writeDone(slug: string, done: boolean) {
  try {
    if (done) localStorage.setItem(doneKey(slug), '1');
    else localStorage.removeItem(doneKey(slug));
  } catch {
    // Private mode / blocked storage: the survey still works, we just can't remember it.
  }
}

export default function SurveyPage() {
  const { slug = '' } = useParams();
  const survey = findSurvey(slug);
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>(() => (readDone(slug) ? 'done' : 'intro'));
  const [alreadyAnswered, setAlreadyAnswered] = useState(() => readDone(slug));
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const advanceTimer = useRef<number | undefined>(undefined);

  const questions = survey?.questions ?? [];
  const question = questions[step];
  const isLast = step === questions.length - 1;
  const section: SurveySection =
    phase === 'questions' && question ? question.section : phase === 'done' ? 'next' : 'course';

  useEffect(() => {
    document.title = 'Avaliação do curso · W-Tech';
    return () => window.clearTimeout(advanceTimer.current);
  }, []);

  // Move focus to the new question title so screen readers announce it.
  useEffect(() => {
    if (phase === 'questions' && question) {
      document.getElementById(`q-${question.id}`)?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [phase, question]);

  const goTo = useCallback((next: number) => {
    window.clearTimeout(advanceTimer.current);
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError('');
  }, [step]);

  const answer = useCallback(
    (update: AnswerUpdate) => {
      if (!question) return;
      setAnswers((prev) => ({
        ...prev,
        [question.id]: typeof update === 'function' ? update(prev[question.id]) : update,
      }));
      if (question.type === 'scale' && !isLast) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => goTo(step + 1), AUTO_ADVANCE_MS);
      }
    },
    [question, isLast, goTo, step]
  );

  // Desktop shortcut: number keys pick a scale option.
  useEffect(() => {
    if (phase !== 'questions' || question?.type !== 'scale') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= question.options.length) answer(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, answer]);

  const submit = async () => {
    if (!survey || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/surveys?slug=${encodeURIComponent(survey.slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, name, website: honeypot }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Não foi possível enviar. Tente novamente.');
      }
      writeDone(survey.slug, true);
      setAlreadyAnswered(false);
      setPhase('done');
    } catch (err) {
      const offline = err instanceof TypeError;
      setError(
        offline
          ? 'Sem ligação à internet. Verifique a rede e tente novamente.'
          : (err as Error).message
      );
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    writeDone(slug, false);
    setAnswers({});
    setName('');
    setStep(0);
    setAlreadyAnswered(false);
    setPhase('intro');
  };

  if (!survey) {
    return (
      <Shell section="course">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-black uppercase text-white">Avaliação não encontrada</h1>
          <p className="mt-3 text-white/60">Confirme o link que recebeu no grupo.</p>
          <Link to="/" className="mt-8 font-bold text-[var(--accent-soft)] underline">
            Ir para o site W-Tech
          </Link>
        </div>
      </Shell>
    );
  }

  const canGoBack = phase === 'questions' && step > 0;
  const nextLabel = question?.type === 'multi' && !(answers[question.id] as string[] | undefined)?.length
    ? 'Saltar'
    : 'Seguinte';

  return (
    <Shell
      section={section}
      progress={
        phase === 'intro' ? null : { total: questions.length, done: phase === 'done' ? questions.length : step }
      }
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={phase === 'questions' ? `q-${step}` : phase}
          custom={direction}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 * direction }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col"
        >
          {phase === 'intro' && <SurveyIntro survey={survey} onStart={() => setPhase('questions')} />}

          {phase === 'done' && (
            <SurveyThanks name={name} alreadyAnswered={alreadyAnswered} onAnswerAgain={restart} />
          )}

          {phase === 'questions' && question && (
            <>
              <div className="mb-5 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.16em]">
                <span className="rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[var(--accent-soft)]">
                  {SECTION_LABELS[question.section]}
                </span>
                <span className="text-white/40">
                  {step + 1} / {questions.length}
                </span>
              </div>

              <QuestionStep question={question} value={answers[question.id]} onChange={answer}>
                <label htmlFor="survey-name" className="mb-2 mt-5 block text-sm font-semibold text-white/70">
                  O seu nome <span className="font-normal text-white/40">(opcional)</span>
                </label>
                <input
                  id="survey-name"
                  type="text"
                  autoComplete="name"
                  maxLength={MAX_NAME_LENGTH}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Ricardo Silva"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white placeholder:text-white/35 transition-colors focus:border-[var(--accent)] focus:outline-none"
                />
                {/* Honeypot: hidden from people, bots tend to fill it. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute -left-[9999px] size-px opacity-0"
                  aria-hidden
                />
              </QuestionStep>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                  {error}
                </p>
              )}

              <div className="mt-auto flex items-center gap-3 pt-8">
                {canGoBack && (
                  <button
                    type="button"
                    onClick={() => goTo(step - 1)}
                    aria-label="Pergunta anterior"
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 text-white/75 transition-colors hover:border-white/35 hover:text-white"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                )}
                {question.type === 'scale' ? (
                  answers[question.id] !== undefined && (
                    <button
                      type="button"
                      onClick={() => goTo(step + 1)}
                      className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-white/35"
                    >
                      Seguinte <ArrowRight className="size-4" />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={isLast ? submit : () => goTo(step + 1)}
                    disabled={sending}
                    className={cn(
                      'flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-base font-extrabold uppercase tracking-wide text-[var(--accent-ink)] shadow-[0_18px_40px_-16px_var(--accent)] transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70'
                    )}
                  >
                    {isLast ? (
                      sending ? (
                        <>
                          <Loader2 className="size-5 animate-spin" /> A enviar…
                        </>
                      ) : (
                        <>
                          Enviar avaliação <Send className="size-4" />
                        </>
                      )
                    ) : (
                      <>
                        {nextLabel} <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function Shell({
  section,
  progress = null,
  children,
}: {
  section: SurveySection;
  progress?: { total: number; done: number } | null;
  children: ReactNode;
}) {
  return (
    <div
      style={SECTION_THEME[section]}
      className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-[#0A0A0B] font-sans text-white antialiased"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {(Object.keys(GLOW) as SurveySection[]).map((key) => (
          <div
            key={key}
            className="absolute -top-56 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-700"
            style={{
              background: `radial-gradient(closest-side, ${GLOW[key]}, transparent)`,
              opacity: key === section ? 0.55 : 0,
            }}
          />
        ))}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 75%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-10 bg-gradient-to-b from-[#0A0A0B] via-[#0A0A0B]/85 to-transparent px-4 pb-3 pt-4">
        <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-3">
          <img src="/logo-wtech-branca.webp" alt="W-Tech" width={120} height={40} className="h-8 w-auto" />
          <span aria-hidden className="text-xs font-bold text-white/30">×</span>
          <img src="/images/brands/liqui-moly.png" alt="LIQUI MOLY" width={46} height={30} className="h-7 w-auto rounded-[3px]" />
        </div>
        {progress && (
          <div
            className="mx-auto mt-3 flex w-full max-w-lg gap-1"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-label="Progresso da avaliação"
          >
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  i < progress.done ? 'bg-[var(--accent)]' : i === progress.done ? 'bg-white/35' : 'bg-white/10'
                )}
              />
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8 pt-4 sm:pt-8">{children}</main>
    </div>
  );
}
