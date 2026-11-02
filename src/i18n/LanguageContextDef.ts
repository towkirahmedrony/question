import { createContext } from 'react';
import type { Language, translations } from './translations';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations['en'];
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
