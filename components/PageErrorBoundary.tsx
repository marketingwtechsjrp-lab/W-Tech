import React, { useEffect, useState } from 'react';
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

const mensagemDoErro = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const registrarErro = async (acao: string, error: unknown, origem?: string) => {
    // Só o pathname: a query pode trazer dados de quem está navegando.
    const { pathname, search } = window.location;
    if (isPreviewRoute(pathname, search)) return;

    const mensagem = mensagemDoErro(error).slice(0, 200);
    // A rota vai no label porque é o único campo que chega ao GA4; a coluna `path` fica só no painel.
    await trackEvent('Erro de tela', acao, [pathname, origem, mensagem].filter(Boolean).join(' | '));
};

/** Devolve o resultado, ou nulo se a rede passar de 3 s: nada aqui pode segurar o reload. */
const comLimite = <T,>(promessa: Promise<T>): Promise<T | null> =>
    Promise.race([promessa, new Promise<null>((pronto) => setTimeout(() => pronto(null), 3000))]);

/**
 * No WebKit, um <link rel="modulepreload"> que falhou fica preso na memória: o arquivo não é
 * pedido de novo nem depois de recarregar, e a tela de aviso voltaria sempre (WebKit bug 270357;
 * medido em 06/11/2026 no WebKit 26.4 do Playwright). O Vite injeta esse link em toda página
 * sob demanda. Baixar os arquivos antes renova essa entrada.
 *
 * Devolve falso se a rede recusou algum arquivo. Rede lenta conta como viva.
 */
const renovarArquivos = async (): Promise<boolean> => {
    const arquivos = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"]'));
    const resultado = await comLimite(
        Promise.allSettled(arquivos.map((link) => fetch(link.href, { cache: 'reload' }).then((resposta) => resposta.blob()))),
    );
    return !resultado?.some((item) => item.status === 'rejected');
};

/** O botão recarrega de qualquer jeito: quem clicou já decidiu tentar. */
const recarregarPagina = async () => {
    await renovarArquivos();
    window.location.reload();
};

// A mensagem de arquivo que não chegou muda de navegador para navegador.
const FALHA_DE_ARQUIVO = /dynamically imported module|importing a module script failed|unable to preload css|not a valid javascript mime type/i;

const chaveDaTentativa = () => `wtech_nova_tentativa:${window.location.pathname}`;

/** Só para arquivo que não chegou: um erro de programação voltaria igual depois do reload. */
const podeTentarDeNovo = (error: unknown): boolean => {
    if (!FALHA_DE_ARQUIVO.test(mensagemDoErro(error)) || navigator.onLine === false) return false;
    try {
        return sessionStorage.getItem(chaveDaTentativa()) === null;
    } catch {
        return false;
    }
};

const marcarTentativa = (): boolean => {
    try {
        sessionStorage.setItem(chaveDaTentativa(), '1');
        return true;
    } catch {
        return false;
    }
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
 * Quando o arquivo da página não chega, o site recarrega sozinho, uma vez por rota em cada sessão,
 * e a pessoa só vê o carregamento. Sem a marca ou sem rede não recarrega: a marca é o que impede a
 * repetição infinita, e o reload sem rede cairia na página de erro do navegador, sem o WhatsApp.
 */
const PageErrorFallback = ({ error }: { error: unknown }) => {
    const [tentando, setTentando] = useState(() => podeTentarDeNovo(error));

    useEffect(() => {
        if (!tentando) return;
        void (async () => {
            if (marcarTentativa()) {
                // Espera o registro: a navegação cancelaria o envio, e o painel não veria a tentativa.
                const [redeRespondeu] = await Promise.all([
                    renovarArquivos(),
                    comLimite(registrarErro('page_load_retry', error)),
                ]);
                if (redeRespondeu) {
                    window.location.reload();
                    return;
                }
            }
            void registrarErro('page_render_error', error);
            setTentando(false);
        })();
    }, [error, tentando]);

    if (!tentando) return <PageErrorScreen />;

    return (
        <main data-page-error role="status" aria-label="Carregando" className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-10 h-10 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin" />
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
            // Na nova tentativa, quem registra é o PageErrorFallback: `page_render_error` é só de quem viu o aviso.
            onError={(error) => {
                if (!podeTentarDeNovo(error)) void registrarErro('page_render_error', error);
            }}
            fallback={(error) => <PageErrorFallback error={error} />}
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
