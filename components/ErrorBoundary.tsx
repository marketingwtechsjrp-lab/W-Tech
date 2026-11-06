import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** UI exibida quando algo abaixo quebra. Default: nada (null). */
    fallback?: React.ReactNode;
    /** Callback opcional p/ logar/telemetria. */
    onError?: (error: Error, info: React.ErrorInfo) => void;
    /** Quando muda, a área sai do estado de erro e os filhos são renderizados de novo. */
    resetKey?: string;
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

    componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
        // `prevState.hasError` deixa passar o commit em que o erro apareceu: se a própria
        // mudança da chave causou o erro, limpar aqui renderizaria de novo o que acabou de quebrar.
        if (this.state.hasError && prevState.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
