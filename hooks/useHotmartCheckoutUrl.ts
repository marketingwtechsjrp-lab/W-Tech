import { useEffect, useState } from 'react';
import { normalizeHotmartCheckoutUrl } from '../lib/coursePricing';
import { supabase } from '../lib/supabaseClient';

type HotmartCheckoutUrl = string | null;
type HotmartCheckoutState = HotmartCheckoutUrl | undefined;

// `undefined` = leitura ainda não concluída; `null` = ausente/inválida.
// O cache e a Promise ficam no módulo para que todas as LPs compartilhem a
// mesma consulta, inclusive durante transições de rota na SPA.
let cachedHotmartCheckoutUrl: HotmartCheckoutState;
let pendingHotmartCheckoutUrl: Promise<HotmartCheckoutUrl> | null = null;

const readHotmartCheckoutUrl = async (): Promise<HotmartCheckoutUrl> => {
    try {
        const { data, error } = await supabase
            .from('SITE_Config')
            .select('value')
            .eq('key', 'hotmart_checkout_url')
            .maybeSingle();

        if (error) return null;
        return normalizeHotmartCheckoutUrl(data?.value);
    } catch {
        return null;
    }
};

const loadHotmartCheckoutUrl = (): Promise<HotmartCheckoutUrl> => {
    if (cachedHotmartCheckoutUrl !== undefined) {
        return Promise.resolve(cachedHotmartCheckoutUrl);
    }

    if (!pendingHotmartCheckoutUrl) {
        pendingHotmartCheckoutUrl = readHotmartCheckoutUrl()
            .then((checkoutUrl) => {
                cachedHotmartCheckoutUrl = checkoutUrl;
                return checkoutUrl;
            })
            .finally(() => {
                pendingHotmartCheckoutUrl = null;
            });
    }

    return pendingHotmartCheckoutUrl;
};

/**
 * Lê o checkout internacional uma única vez por carregamento da aplicação.
 * A consulta só começa para região internacional; visitantes do Brasil não
 * pagam esse custo. Enquanto a leitura resolve, o chamador recebe `undefined`
 * e mantém o fallback oficial da Hotmart para a oferta de cobrança única.
 */
export const useHotmartCheckoutUrl = (enabled: boolean): HotmartCheckoutState => {
    const [checkoutUrl, setCheckoutUrl] = useState<HotmartCheckoutState>(
        () => cachedHotmartCheckoutUrl,
    );

    useEffect(() => {
        if (!enabled || checkoutUrl !== undefined) return;

        let active = true;
        loadHotmartCheckoutUrl().then((loadedUrl) => {
            if (active) setCheckoutUrl(loadedUrl);
        });

        return () => {
            active = false;
        };
    }, [checkoutUrl, enabled]);

    return checkoutUrl;
};
