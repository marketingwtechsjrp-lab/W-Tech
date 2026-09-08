import { NotFoundPage } from "@/components/ui/not-found-page-2";
import SEO from "../components/SEO";

/**
 * Esta tela agora é servida COM status 404 (ou 410, para as URLs do glossário do
 * WordPress antigo): server/publicRoutes.ts decide se o caminho existe antes de
 * entregar a casca da SPA. O `noindex` continua como segunda linha de defesa —
 * se um caminho novo do App.tsx faltar naquela lista, ele sai com 200 e ao menos
 * não é indexado.
 */
export default function NotFound() {
  return (
    <>
      <SEO title="Página não encontrada" noindex />
      <NotFoundPage />
    </>
  );
}
