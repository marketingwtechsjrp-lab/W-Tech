import React, { createContext, useContext, useState, useEffect } from 'react';
import { siteTranslations, SiteLanguage, TranslationDictionary } from '../lib/siteTranslations';
import {
    detectBrowserLandingLanguage,
    detectGeoLandingLanguage,
} from '../lib/geoLanguage';

interface LanguageContextType {
    currentLang: SiteLanguage;
    setLanguage: (lang: SiteLanguage) => void;
    t: TranslationDictionary;
    currency: 'EUR' | 'BRL';
    formatPrice: (eurAmount: number | string, brlAmount: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const detectUserLanguage = (): SiteLanguage => {
    return detectBrowserLandingLanguage();
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLang, setCurrentLang] = useState<SiteLanguage>(() => detectUserLanguage());

    useEffect(() => {
        const controller = new AbortController();
        detectGeoLandingLanguage(controller.signal).then(setCurrentLang);
        return () => controller.abort();
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
