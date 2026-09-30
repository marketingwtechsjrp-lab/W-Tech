import { COURSE_NAME } from './courseSchema';

/**
 * Chamada do fim de página no glossário e no blog: conteúdo de suspensão leva ao
 * curso online de regulagem; o resto (motor, freio, elétrica), aos cursos da W-Tech.
 */
export type ChamadaCurso = { eyebrow: string; title: string; text: string; href: string; label: string };

export const SUSPENSAO_RE = /suspens|amortec|mola|sag|pr[eé]-?carga|bengala|garfo|kyb|showa|wp\b|retorno|compress/;

export function chamadaDoCurso(ehSuspensao: boolean): ChamadaCurso {
  if (ehSuspensao) {
    return {
      eyebrow: 'Curso online',
      title: 'Aprenda a regular a suspensão da sua moto',
      text: `No ${COURSE_NAME} você aprende, do zero, a medir o SAG e a acertar molas, óleo e cliques na sua própria moto.`,
      href: '/curso-suspensao-piloto',
      label: 'Conhecer o curso',
    };
  }
  return {
    eyebrow: 'Cursos W-Tech',
    title: 'Quer dominar a mecânica da sua moto?',
    text: 'A W-Tech forma pilotos e mecânicos em cursos presenciais e online de suspensão.',
    href: '/cursos',
    label: 'Ver os cursos',
  };
}

/** Texto livre (título, slug, categoria) fala de suspensão? Sem acento e em minúsculas. */
export function falaDeSuspensao(...partes: Array<string | null | undefined>): boolean {
  const texto = partes.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return SUSPENSAO_RE.test(texto);
}
