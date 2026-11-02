import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Clock, ListChecks, MapPin, UserRound, Instagram } from 'lucide-react';
import type { Survey } from '../../lib/surveys';

export function SurveyIntro({ survey, onStart }: { survey: Survey; onStart: () => void }) {
  const facts = [
    { icon: ListChecks, label: `${survey.questions.length} perguntas` },
    { icon: Clock, label: '1 minuto' },
    { icon: UserRound, label: 'Nome opcional' },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/80">
        <span aria-hidden>🇵🇹</span> {survey.city} · {survey.dates}
      </span>

      <h1 className="text-[2.9rem] font-black uppercase leading-[0.92] tracking-[-0.03em] text-white sm:text-6xl">
        Como foi o <span className="text-[var(--accent)]">seu curso?</span>
      </h1>

      <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
        Avaliação rápida da formação. A sua opinião ajuda-nos a preparar o próximo curso W‑Tech
        ainda melhor.
      </p>

      <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-soft)]">
          Formação
        </p>
        <p className="mt-1 text-lg font-extrabold leading-snug text-white">{survey.course}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/55">
          <MapPin className="size-4 shrink-0" /> {survey.location}
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2">
        {facts.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 py-3 text-center text-xs font-semibold text-white/70"
          >
            <Icon className="size-4 text-white/45" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onStart}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-4 text-base font-extrabold uppercase tracking-wide text-[var(--accent-ink)] shadow-[0_18px_40px_-14px_var(--accent)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
        >
          Começar avaliação
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

export function SurveyThanks({
  name,
  alreadyAnswered,
  onAnswerAgain,
}: {
  name: string;
  alreadyAnswered: boolean;
  onAnswerAgain: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mb-8 flex size-24 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_0_0_10px_var(--accent-tint),0_25px_60px_-15px_var(--accent)]"
      >
        <Check className="size-12" strokeWidth={3} />
      </motion.div>

      <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-white sm:text-5xl">
        Obrigado{firstName ? `, ${firstName}` : ''}!
      </h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-white/65">
        {alreadyAnswered
          ? 'Já recebemos a sua avaliação deste curso. Obrigado pelo tempo!'
          : 'A sua avaliação foi enviada. Vemo-nos no próximo curso W‑Tech.'}
      </p>

      <div className="mt-10 grid w-full max-w-sm gap-2.5">
        <Link
          to="/cursos"
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
        >
          Ver próximos cursos <ArrowRight className="size-4" />
        </Link>
        <a
          href="https://www.instagram.com/wtechbrasil"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-bold text-white/85 transition-colors hover:border-white/35 hover:text-white"
        >
          <Instagram className="size-4" /> Seguir @wtechbrasil
        </a>
        <a
          href="https://www.instagram.com/liquimolyiberia"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-bold text-white/85 transition-colors hover:border-white/35 hover:text-white"
        >
          <Instagram className="size-4" /> Seguir @liquimolyiberia
        </a>
      </div>

      {alreadyAnswered && (
        <button
          type="button"
          onClick={onAnswerAgain}
          className="mt-8 text-xs font-semibold text-white/40 underline underline-offset-4 hover:text-white/70"
        >
          Partilha o telemóvel? Enviar outra avaliação
        </button>
      )}
    </div>
  );
}
