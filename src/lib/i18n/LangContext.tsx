'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { translations, type Lang, type Translations } from './translations';

interface LangContextValue {
  lang:    Lang;
  setLang: (l: Lang) => void;
  t:       Translations;
}

const LangContext = createContext<LangContextValue>({
  lang:    'en',
  setLang: () => {},
  t:       translations.en,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored === 'en' || stored === 'th') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
