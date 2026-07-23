import React, { createContext, useContext, useState, useEffect } from 'react';
import { siteTranslations, SiteLanguage, TranslationDictionary } from '../lib/siteTranslations';

interface LanguageContextType {
    currentLang: SiteLanguage;
    setLanguage: (lang: SiteLanguage) => void;
    t: TranslationDictionary;
    currency: 'EUR' | 'BRL';
    formatPrice: (eurAmount: number | string, brlAmount: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const detectUserLanguage = (): SiteLanguage => {
    if (typeof window === 'undefined') return 'pt-PT';

    // 1. Storage override
    try {
        const saved = localStorage.getItem('wtech_global_lang') as SiteLanguage;
        if (saved && siteTranslations[saved]) {
            return saved;
        }
    } catch (e) {
        // Storage unavailable
    }

    // 2. Browser Timezone Detection
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

        if (tz.includes('Sao_Paulo') || tz.includes('Fortaleza') || tz.includes('Manaus') || tz.includes('Recife') || tz.includes('Belem') || tz.includes('Cuiaba') || tz.includes('Campo_Grande') || tz.includes('Bahia')) {
            return 'pt-BR';
        }
        if (tz.includes('Lisbon') || tz.includes('Madeira') || tz.includes('Azores')) {
            return 'pt-PT';
        }
        if (tz.includes('Madrid') || tz.includes('Canary') || tz.includes('Buenos_Aires') || tz.includes('Santiago') || tz.includes('Bogota') || tz.includes('Mexico') || tz.includes('Lima')) {
            return 'es';
        }
        if (tz.includes('London') || tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Toronto') || tz.includes('Sydney')) {
            return 'en';
        }
    } catch (e) {
        // Timezone detection failed
    }

    // 3. Navigator Languages Fallback
    try {
        const navLangs = navigator.languages || [navigator.language || ''];
        for (const lang of navLangs) {
            const lower = lang.toLowerCase();
            if (lower.startsWith('es')) return 'es';
            if (lower.startsWith('en')) return 'en';
            if (lower === 'pt-br') return 'pt-BR';
            if (lower.startsWith('pt')) return 'pt-PT';
        }
    } catch (e) {
        // Navigator fallback failed
    }

    // Default for European / International portal
    return 'pt-PT';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLang, setCurrentLang] = useState<SiteLanguage>('pt-PT');

    useEffect(() => {
        const detected = detectUserLanguage();
        setCurrentLang(detected);
    }, []);

    const setLanguage = (lang: SiteLanguage) => {
        setCurrentLang(lang);
        try {
            localStorage.setItem('wtech_global_lang', lang);
        } catch (e) {
            // Storage write failed
        }
    };

    const currency: 'EUR' | 'BRL' = currentLang === 'pt-BR' ? 'BRL' : 'EUR';

    const formatPrice = (eurAmount: number | string, brlAmount: number | string): string => {
        if (currency === 'BRL') {
            if (typeof brlAmount === 'number') {
                return `R$ ${brlAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return `R$ ${brlAmount}`;
        } else {
            if (typeof eurAmount === 'number') {
                return `${eurAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
            }
            return `${eurAmount} €`;
        }
    };

    const t = siteTranslations[currentLang] || siteTranslations['pt-PT'];

    return (
        <LanguageContext.Provider value={{ currentLang, setLanguage, t, currency, formatPrice }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
