import { useEffect, useState } from 'react';
import { type BillingRegion, detectBillingRegion, guessBillingRegion } from '../lib/coursePricing';

/**
 * Região de cobrança do visitante (Brasil x internacional), decidida pelo país
 * do IP e independente do idioma escolhido no seletor.
 *
 * Começa com o palpite síncrono do navegador para o botão de checkout já nascer
 * com destino válido, e troca para a resposta do IP quando ela chega. Na prática
 * o ajuste é imperceptível: a consulta responde antes de o visitante rolar até
 * a oferta, e o palpite acerta a grande maioria dos casos.
 */
export const useBillingRegion = (): BillingRegion => {
    const [region, setRegion] = useState<BillingRegion>(guessBillingRegion);

    useEffect(() => {
        // A consulta de geo é compartilhada e não se cancela; ao desmontar
        // apenas paramos de aplicar o resultado.
        let ativo = true;

        detectBillingRegion()
            .then((detectada) => {
                if (ativo) setRegion(detectada);
            })
            .catch(() => {
                // O palpite inicial permanece válido.
            });

        return () => {
            ativo = false;
        };
    }, []);

    return region;
};
