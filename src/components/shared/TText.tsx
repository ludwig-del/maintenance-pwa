'use client';

import { useLang } from '@/lib/i18n/LangContext';

export function TText({ en, th }: { en: string; th: string }) {
  const { lang } = useLang();
  return <>{lang === 'th' ? th : en}</>;
}
