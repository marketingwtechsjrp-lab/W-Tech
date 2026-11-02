/**
 * Course feedback surveys (public quiz at /avaliacao/:slug).
 * Shared by the quiz page, the API (api/_surveys.ts), the 404 check (server/publicRoutes.ts),
 * the share pages built by vite.config.ts and the admin results view —
 * so keep this file free of React/browser/Node imports.
 *
 * New course? Add an entry to SURVEYS and send /avaliacao/<slug> to the group.
 */

export type SurveySection = 'course' | 'brand' | 'next'

interface BaseQuestion {
  id: string
  section: SurveySection
  title: string
  lead?: string
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale'
  /** Labels from worst (score 1) to best (score N). */
  options: string[]
  tone: 'mood' | 'level'
}

export interface MultiQuestion extends BaseQuestion {
  type: 'multi'
  options: string[]
}

export interface TextQuestion extends BaseQuestion {
  type: 'text'
  placeholder: string
}

export type SurveyQuestion = ScaleQuestion | MultiQuestion | TextQuestion

export type SurveyAnswerValue = number | string[] | string
export type SurveyAnswers = Record<string, SurveyAnswerValue>

export interface Survey {
  slug: string
  /** SITE_Courses.id of the class being evaluated. */
  courseId: string
  course: string
  dates: string
  /** Short place tag on the intro badge, e.g. "Lisboa". */
  city: string
  location: string
  questions: SurveyQuestion[]
}

export const SECTION_LABELS: Record<SurveySection, string> = {
  course: 'O curso',
  brand: 'LIQUI MOLY',
  next: 'Próximo curso',
}

const QUALITY = ['Muito mau', 'Mau', 'Satisfatório', 'Bom', 'Excelente']
const LIKELIHOOD = [
  'Nenhuma',
  'Inclinado a dizer não',
  'Inclinado a dizer sim',
  'Provável',
  'Muito provável',
]

export const SURVEYS: Survey[] = [
  {
    slug: 'lisboa-outubro-2026',
    courseId: 'b88e8979-520a-4c37-8cb8-1128e7e5dffc',
    course: 'Suspensão de Alta Performance · 2ª Edição',
    dates: '23 – 25 Out 2026',
    city: 'Lisboa',
    location: 'Art On Wheels Garage · Sintra',
    questions: [
      {
        id: 'course',
        section: 'course',
        type: 'scale',
        tone: 'mood',
        title: 'Como avalia o curso Suspensão de Alta Performance?',
        options: QUALITY,
      },
      {
        id: 'instructor',
        section: 'course',
        type: 'scale',
        tone: 'mood',
        title:
          'Como avalia o grau de conhecimento do formador Alex Crepaldi e a capacidade de transmitir esse aprendizado?',
        options: QUALITY,
      },
      {
        id: 'venue',
        section: 'course',
        type: 'scale',
        tone: 'mood',
        title: 'Como avalia o local onde decorreu o curso?',
        options: QUALITY,
      },
      {
        id: 'return',
        section: 'course',
        type: 'scale',
        tone: 'level',
        title: 'Qual a probabilidade de voltar a inscrever-se num curso ministrado pela W-Tech?',
        options: LIKELIHOOD,
      },
      {
        id: 'brand_awareness',
        section: 'brand',
        type: 'scale',
        tone: 'level',
        lead: 'A LIQUI MOLY é parceira dos cursos ministrados pela W-Tech.',
        title: 'Qual era o seu grau de conhecimento da marca antes deste curso?',
        options: [
          'Não conhecia',
          'Ouvi falar',
          'Conhecia',
          'Conhecia, mas apenas que tinha lubrificantes e aditivos',
          'Sabia que era uma marca 360º com entrega total',
        ],
      },
      {
        id: 'brand_purchase',
        section: 'brand',
        type: 'scale',
        tone: 'level',
        title:
          'Qual a probabilidade de começar a trabalhar ou de adquirir mais produtos LIQUI MOLY após o curso?',
        options: LIKELIHOOD,
      },
      {
        id: 'brand_range',
        section: 'brand',
        type: 'scale',
        tone: 'level',
        title: 'Como avalia a gama de produtos/soluções LIQUI MOLY?',
        options: ['Muito fraca', 'Fraca', 'Satisfatória', 'Completa', 'Muito completa'],
      },
      {
        id: 'topics',
        section: 'next',
        type: 'multi',
        title: 'Que matérias gostaria de ver desenvolvidas num próximo curso da W-Tech?',
        options: [
          'Revalving e afinação do hidráulico',
          'Manutenção de amortecedores traseiros',
          'Setup de suspensão para pista',
          'Suspensão off-road / enduro',
          'Ergonomia e posição de condução',
        ],
      },
      {
        id: 'suggestions',
        section: 'next',
        type: 'text',
        title: 'Caixa de sugestões',
        lead: 'Deixe-nos as suas sugestões para continuarmos a melhorar a nossa entrega para si.',
        placeholder: 'Escreva aqui o que podemos fazer ainda melhor…',
      },
    ],
  },
]

export const MAX_TEXT_LENGTH = 2000
export const MAX_NAME_LENGTH = 120

export function findSurvey(slug: string): Survey | undefined {
  return SURVEYS.find((s) => s.slug === slug)
}

type ValidationResult = { ok: true; answers: SurveyAnswers } | { ok: false; error: string }

/** Validates raw answers against the survey and returns a clean copy (unknown keys dropped). */
export function validateSurveyAnswers(survey: Survey, raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Respostas em falta' }
  }
  const input = raw as Record<string, unknown>
  const answers: SurveyAnswers = {}

  for (const q of survey.questions) {
    const value = input[q.id]

    if (q.type === 'scale') {
      if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > q.options.length) {
        return { ok: false, error: `Resposta inválida: "${q.title}"` }
      }
      answers[q.id] = value as number
    } else if (q.type === 'multi') {
      if (value === undefined) continue
      if (!Array.isArray(value) || value.some((v) => !q.options.includes(v as string))) {
        return { ok: false, error: `Resposta inválida: "${q.title}"` }
      }
      answers[q.id] = q.options.filter((o) => value.includes(o))
    } else {
      if (value === undefined) continue
      if (typeof value !== 'string') return { ok: false, error: `Resposta inválida: "${q.title}"` }
      const text = value.trim().slice(0, MAX_TEXT_LENGTH)
      if (text) answers[q.id] = text
    }
  }

  return { ok: true, answers }
}

export function cleanRespondentName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim().slice(0, MAX_NAME_LENGTH)
  return name || null
}
