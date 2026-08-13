/**
 * Geração de dados de teste — DESATIVADA.
 *
 * A implementação anterior inseria um usuário admin (`admin@w-tech.com` /
 * senha em TEXTO PURO "123") direto em SITE_Users a partir do navegador, com
 * a chave anon — qualquer visitante em `/` conseguia clicar em "Primeiro
 * Acesso? Gerar Admin de Teste" (LoginModal) e criar um acesso administrativo
 * completo sem autenticação nenhuma. Também inseria leads/pedidos/transações/
 * cursos/mecânicos fictícios pelas mesmas vias (anon INSERT direto).
 *
 * Não existe hoje um caminho seguro para recriar isso (exigiria um endpoint
 * server-side com sua própria autorização), então a função fica desativada —
 * com erro claro — em vez de continuar aberta ao público. Acesso admin passa
 * a ser criado por um administrador existente em Equipe & Acessos.
 */
export const seedDatabase = async (): Promise<string> => {
  throw new Error(
    'Geração de dados de teste desativada por segurança (criava um admin com senha em texto puro, acessível a qualquer visitante). ' +
    'Peça a um administrador existente para criar seu acesso em Admin → Equipe & Acessos.'
  );
};
