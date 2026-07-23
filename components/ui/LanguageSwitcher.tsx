import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { siteTranslations, SiteLanguage } from '../../lib/siteTranslations';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    className?: string;
    compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', compact = false }) => {
    const { currentLang, setLanguage } = useLanguage();

    const languages: SiteLanguage[] = ['pt-PT', 'es', 'en', 'pt-BR'];

    return (
        <div className={`inline-flex items-center gap-1 bg-black/60 p-1 rounded-full border border-white/15 backdrop-blur-md ${className}`}>
            {!compact && <Globe size={13} className="text-amber-400 ml-1.5 shrink-0" />}
            {languages.map((langKey) => {
                const item = siteTranslations[langKey];
                const active = currentLang === langKey;
                const displayCode = langKey === 'pt-PT' ? 'PT' : langKey === 'pt-BR' ? 'BR' : langKey.toUpperCase();

                return (
                    <button
                        key={langKey}
                        onClick={() => setLanguage(langKey)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            active
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-sm font-extrabold'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={item.langName}
                    >
                        <span>{item.flag}</span>
                        <span>{displayCode}</span>
                    </button>
                );
            })}
        </div>
    );
};
