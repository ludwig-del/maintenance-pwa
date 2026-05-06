'use client';

import { useLang } from '@/lib/i18n/LangContext';
import { Globe } from 'lucide-react';

export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
      className="fixed bottom-5 right-4 z-50 flex items-center gap-1.5 bg-white border border-gray-200 shadow-md rounded-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
      aria-label="Toggle language"
    >
      <Globe className="w-3.5 h-3.5 text-gray-500" />
      {lang === 'en' ? 'TH' : 'EN'}
    </button>
  );
}
