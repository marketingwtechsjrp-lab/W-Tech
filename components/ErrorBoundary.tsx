import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** UI exibida quando algo abaixo quebra. Default: nada (null). */
    fallback?: React.ReactNode;
    /** Callback opcional p/ logar/telemetria. */
    onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/**
 * ErrorBoundary genérico.
 *
 * Captura erros de render, de ciclo de vida e de efeitos (useEffect) na árvore
 * abaixo dele, evitando que um único componente derrube a página inteira
 * (tela branca). Use com `fallback={null}` para enfeites (ex.: shaders WebGL)
 * ou com um fallback útil para áreas críticas.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
        this.props.onError?.(error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
