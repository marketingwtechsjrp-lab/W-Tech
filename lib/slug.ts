/**
 * Geração de slug para URL pública.
 *
 * O `normalize('NFD')` seguido da remoção dos acentos combinantes é a parte que
 * não pode faltar: sem ela, "Curso de Suspensão em Chapecó" vira
 * `curso-de-suspenso-em-chapec` — a palavra que a pessoa realmente pesquisa
 * ("suspensão") desaparece da URL. Estão assim em produção, entre outras,
 * /lp/curso-de-suspenso-w-tech-em-chapec e
 * /lp/cusro-de-experience-w-tech-em-so-jos-do-rio-preto.
 *
 * Slug de página já publicada NÃO deve ser trocado sem redirect 301: há anúncios
 * ativos apontando para as URLs atuais.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
