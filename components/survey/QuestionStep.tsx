import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MAX_TEXT_LENGTH, type SurveyAnswerValue, type SurveyQuestion } from '../../lib/surveys';

const MOODS = ['😣', '🙁', '😐', '🙂', '🤩'];

export type AnswerUpdate =
  | SurveyAnswerValue
  | ((prev: SurveyAnswerValue | undefined) => SurveyAnswerValue);

interface QuestionStepProps {
  question: SurveyQuestion;
  value: SurveyAnswerValue | undefined;
  onChange: (update: AnswerUpdate) => void;
  /** Extra fields rendered under the input (used by the last step). */
  children?: ReactNode;
}

export default function QuestionStep({ question, value, onChange, children }: QuestionStepProps) {
  return (
    <div>
      {question.lead && (
        <p className="mb-3 text-sm font-semibold leading-relaxed text-[var(--accent-soft)]">
          {question.lead}
        </p>
      )}
      <h2
        id={`q-${question.id}`}
        tabIndex={-1}
        className="mb-6 text-[1.6rem] font-extrabold leading-[1.15] tracking-tight text-white outline-none sm:text-3xl"
      >
        {question.title}
      </h2>

      {question.type === 'scale' && (
        <div role="radiogroup" aria-labelledby={`q-${question.id}`} className="space-y-2.5">
          {question.options.map((label, i) => {
            const score = i + 1;
            const selected = value === score;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(score)}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                  'active:scale-[0.985]',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-tint)] shadow-[0_0_0_1px_var(--accent),0_10px_30px_-12px_var(--accent)]'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center">
                  {question.tone === 'mood' ? (
                    <span
                      aria-hidden
                      className={cn(
                        'text-[1.75rem] leading-none transition-transform duration-200',
                        selected ? 'scale-110' : 'grayscale-[35%] group-hover:grayscale-0'
                      )}
                    >
                      {MOODS[i]}
                    </span>
                  ) : (
                    <LevelMeter level={score} total={question.options.length} active={selected} />
                  )}
                </span>
                <span className="flex-1 text-[0.98rem] font-semibold leading-snug text-white/90">
                  {label}
                </span>
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border transition-all',
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-white/20 text-transparent'
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'multi' && (
        <MultiChoice
          question={question}
          selected={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      )}

      {question.type === 'text' && (
        <div>
          <label htmlFor={`a-${question.id}`} className="sr-only">
            {question.title}
          </label>
          <textarea
            id={`a-${question.id}`}
            rows={5}
            maxLength={MAX_TEXT_LENGTH}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base leading-relaxed text-white placeholder:text-white/35 transition-colors focus:border-[var(--accent)] focus:bg-white/[0.06] focus:outline-none"
          />
          {children}
        </div>
      )}
    </div>
  );
}

function MultiChoice({
  question,
  selected,
  onChange,
}: {
  question: SurveyQuestion & { type: 'multi' };
  selected: string[];
  onChange: (update: AnswerUpdate) => void;
}) {
  // Functional update so quick consecutive taps never work from a stale selection.
  const toggle = (option: string) =>
    onChange((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
    });

  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
        Pode escolher várias
      </legend>
      <div className="grid grid-cols-1 gap-2.5">
        {question.options.map((option) => {
          const isOn = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              onClick={() => toggle(option)}
              className={cn(
                'flex w-full items-center gap-3.5 rounded-2xl border px-4 py-4 text-left transition-all duration-200 active:scale-[0.985]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                isOn
                  ? 'border-[var(--accent)] bg-[var(--accent-tint)]'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md border transition-all',
                  isOn
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-white/25 text-transparent'
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span className="text-[0.98rem] font-semibold text-white/90">{option}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function LevelMeter({ level, total, active }: { level: number; total: number; active: boolean }) {
  return (
    <span aria-hidden className="flex h-7 items-end gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{ height: `${30 + (i / (total - 1)) * 70}%` }}
          className={cn(
            'w-[5px] rounded-full transition-colors duration-200',
            i < level ? (active ? 'bg-[var(--accent)]' : 'bg-white/70') : 'bg-white/15'
          )}
        />
      ))}
    </span>
  );
}
