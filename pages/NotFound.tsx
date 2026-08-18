import { NotFoundPage } from "@/components/ui/not-found-page-2";
import SEO from "../components/SEO";

/**
 * A SPA responde 200 em qualquer rota (fallback do BrowserRouter), então uma URL
 * inexistente é um soft 404: o mecanismo gasta rastreamento e pode indexar página vazia.
 * Sem uma lista de rotas no servidor não dá para devolver 404 de verdade; o `noindex`
 * é o mínimo que impede a indexação.
 */
export default function NotFound() {
  return (
    <>
      <SEO title="Página não encontrada" noindex />
      <NotFoundPage />
    </>
  );
}
