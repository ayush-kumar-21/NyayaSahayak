
import { translations } from '../constants/localization';
import type { Translations } from '../constants/localization';

export type Language = keyof Translations;

export const useLocalization = (language: Language) => {
    const t = (key: keyof Translations['en']) => {
        return translations[language][key] || translations['en'][key];
    };
    return { t };
};
