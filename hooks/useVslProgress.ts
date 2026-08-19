import { useCallback, useEffect, useRef } from 'react';
import { VSL_VIDEO_ID } from '../lib/vslVideo';

/**
 * Telemetria de retenção da VSL.
 *
 * Manda batidas periódicas para /api/vsl-progress enquanto o vídeo roda e uma
 * batida final quando a aba some. O ponto que interessa é o MAIS DISTANTE já
 * assistido, não a posição atual: se a pessoa volta para rever um trecho, ela
 * não "desassistiu" o que já viu.
 *
 * A batida final usa `navigator.sendBeacon`, único jeito confiável de enviar
 * algo durante o descarregamento da página — é justamente quem abandona que a
 * gente mais precisa registrar, e um fetch normal seria cancelado.
 */

const INTERVALO_MS = 5000;

interface Opcoes {
    /** vsl_dark | vsl_light | lp_v2 … — de onde a sessão está assistindo. */
    page: string;
    theme?: string;
    language?: string;
    quizProfile?: string | null;
}

const identificador = (chave: string, armazenamento: Storage, prefixo: string): string => {
    try {
        const salvo = armazenamento.getItem(chave);
        if (salvo) return salvo;
        const novo = `${prefixo}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        armazenamento.setItem(chave, novo);
        return novo;
    } catch {
        return `${prefixo}_efemero`;
    }
};

const parametro = (nome: string): string | null => {
    try {
        return new URLSearchParams(window.location.search).get(nome);
    } catch {
        return null;
    }
};

export const useVslProgress = (
    videoRef: React.RefObject<HTMLVideoElement>,
    { page, theme, language, quizProfile }: Opcoes,
) => {
    const maiorAssistidoRef = useRef(0);
    const ultimoEnviadoRef = useRef(-1);

    const montarPayload = useCallback(() => {
        const video = videoRef.current;
        if (!video) return null;

        return {
            visitor_id: identificador('wtech_visitor_id', localStorage, 'v'),
            session_id: identificador('wtech_session_id', sessionStorage, 's'),
            video_id: VSL_VIDEO_ID,
            page,
            theme,
            language,
            duration_seconds: Number.isFinite(video.duration) ? video.duration : null,
            max_watched_seconds: maiorAssistidoRef.current,
            last_position_seconds: video.currentTime,
            quiz_profile: quizProfile || parametro('quiz_profile'),
            utm_source: parametro('utm_source'),
            utm_medium: parametro('utm_medium'),
            utm_campaign: parametro('utm_campaign'),
            utm_content: parametro('utm_content'),
        };
    }, [videoRef, page, theme, language, quizProfile]);

    const enviar = useCallback((viaBeacon: boolean) => {
        // Nada assistido ainda, ou nada novo desde a última batida.
        if (maiorAssistidoRef.current <= 0) return;
        if (Math.floor(maiorAssistidoRef.current) === ultimoEnviadoRef.current) return;

        const payload = montarPayload();
        if (!payload) return;
        ultimoEnviadoRef.current = Math.floor(maiorAssistidoRef.current);

        const corpo = JSON.stringify(payload);
        try {
            if (viaBeacon && navigator.sendBeacon) {
                navigator.sendBeacon('/api/vsl-progress', new Blob([corpo], { type: 'application/json' }));
                return;
            }
            void fetch('/api/vsl-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: corpo,
                keepalive: true,
            }).catch(() => undefined);
        } catch {
            // Telemetria nunca pode atrapalhar a apresentação.
        }
    }, [montarPayload]);

    /** Chamado pelo player a cada timeupdate, com o avanço real já validado. */
    const registrarAvanco = useCallback((segundosAssistidos: number) => {
        if (segundosAssistidos > maiorAssistidoRef.current) {
            maiorAssistidoRef.current = segundosAssistidos;
        }
    }, []);

    useEffect(() => {
        const relogio = window.setInterval(() => enviar(false), INTERVALO_MS);

        const aoSumir = () => {
            if (document.visibilityState === 'hidden') enviar(true);
        };
        document.addEventListener('visibilitychange', aoSumir);
        window.addEventListener('pagehide', () => enviar(true));

        return () => {
            window.clearInterval(relogio);
            document.removeEventListener('visibilitychange', aoSumir);
            enviar(true);
        };
    }, [enviar]);

    return { registrarAvanco };
};
