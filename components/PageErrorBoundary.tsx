import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import { trackEvent } from './AnalyticsTracker';
import { useSettings } from '../context/SettingsContext';

// Mesmo número de reserva de pages/CourseCheckout.tsx. Sem banco a configuração não chega,
// e é justamente nessa hora que a pessoa mais precisa do contato. O mesmo vale quando o erro
// derruba o próprio SettingsProvider: fora dele, `get` devolve vazio.
const TELEFONE_RESERVA = '551732312858';

/** Prévia do painel: não tem integrações públicas nem conta como visita. */
export const isPreviewRoute = (pathname: string, search: string): boolean =>
    pathname === '/lp-preview' || new URLSearchParams(search).get('preview') === '1';

const registrarErro = (acao: string, error: unknown, origem?: string) => {
    // Só o pathname: a query pode trazer dados de quem está navegando.
    const { pathname, search } = window.location;
    if (isPreviewRoute(pathname, search)) return;

    const mensagem = (error instanceof Error ? error.message : String(error)).slice(0, 200);
    // A rota vai no label porque é o único campo que chega ao GA4; a coluna `path` fica só no painel.
    void trackEvent('Erro de tela', acao, [pathname, origem, mensagem].filter(Boolean).join(' | '));
};

/**
 * No WebKit, um <link rel="modulepreload"> que falhou fica preso na memória: o arquivo não é
 * pedido de novo nem depois de recarregar, e a tela de aviso voltaria sempre (WebKit bug 270357;
 * medido em 06/11/2026 no WebKit 26.4 do Playwright). O Vite injeta esse link em toda página
 * sob demanda. Baixar os arquivos antes renova essa entrada. O limite garante o reload sem rede.
 */
const recarregarPagina = async () => {
    const arquivos = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"]'));
    await Promise.race([
        Promise.allSettled(arquivos.map((link) => fetch(link.href, { cache: 'reload' }).then((resposta) => resposta.blob()))),
        new Promise((pronto) => setTimeout(pronto, 3000)),
    ]);
    window.location.reload();
};

const PageErrorScreen = () => {
    const { get } = useSettings();
    const [recarregando, setRecarregando] = useState(false);
    const telefone = String(get('whatsapp_phone')).replace(/\D/g, '') || TELEFONE_RESERVA;
    const mensagem = `Olá! Tive um problema ao abrir a página ${window.location.pathname} do site da W-Tech.`;

    return (
        // `data-page-error` é o sinal para o prerender não gravar esta tela (scripts/prerender.mjs).
        <main data-page-error className="flex min-h-screen items-center justify-center bg-white px-4 py-16 dark:bg-[#111]">
            <div role="alert" className="w-full max-w-md text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Não conseguimos abrir esta página
                </h1>
                <p className="mt-3 text-base text-gray-600 dark:text-gray-300">
                    Tente recarregar. Se o problema continuar, fale com a W-Tech no WhatsApp.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        disabled={recarregando}
                        onClick={() => {
                            setRecarregando(true);
                            void recarregarPagina();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-wtech-gold px-5 py-3 font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-70"
                    >
                        <RefreshCw size={18} aria-hidden="true" className={recarregando ? 'animate-spin' : undefined} />
                        Recarregar a página
                    </button>
                    <a
                        href={`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-white/10"
                    >
                        <MessageCircle size={18} aria-hidden="true" />
                        Falar no WhatsApp
                    </a>
                </div>
            </div>
        </main>
    );
};

/**
 * Última proteção das rotas: um erro de render mostra um aviso em vez de página vazia.
 *
 * O reinício usa `resetKey` e não `key={pathname}`: a key remontaria a árvore a cada
 * navegação saudável, inclusive o Layout, que hoje sobrevive à troca de rota. Só o
 * pathname entra na chave porque o AnalyticsTracker limpa a query logo após carregar,
 * e isso renderizaria de novo a página que acabou de quebrar.
 */
export const PageErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const { pathname } = useLocation();

    return (
        <ErrorBoundary
            resetKey={pathname}
            onError={(error) => registrarErro('page_render_error', error)}
            fallback={<PageErrorScreen />}
        >
            {children}
        </ErrorBoundary>
    );
};

/** Integração que quebra sai de cena sozinha: a página segue no ar e o erro fica registrado. */
export const IntegrationErrorBoundary = ({ nome, children }: { nome: string; children: React.ReactNode }) => {
    const { pathname } = useLocation();

    return (
        <ErrorBoundary resetKey={pathname} onError={(error) => registrarErro('integration_render_error', error, nome)}>
            {children}
        </ErrorBoundary>
    );
};

/**
 * Cobre o que fica acima das rotas: providers e Router. Como o erro derruba o Router, a tela
 * só sai com o reload. O registro não depende do AnalyticsTracker, que cai junto aqui.
 */
export const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary onError={(error) => registrarErro('app_render_error', error)} fallback={<PageErrorScreen />}>
        {children}
    </ErrorBoundary>
);
