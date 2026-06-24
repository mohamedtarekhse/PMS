import { useState, useCallback, useEffect } from 'react';
import { t as translate, getCurrentLang, setDocumentDirection } from '../i18n';

export function useTranslation() {
  const [lang, setLangState] = useState<string>(() => getCurrentLang());

  useEffect(() => {
    setDocumentDirection(lang);
  }, [lang]);

  const setLang = useCallback((newLang: string) => {
    localStorage.setItem('pms_lang', newLang);
    setLangState(newLang);
    setDocumentDirection(newLang);
    try {
      const user = localStorage.getItem('pms_user');
      if (user) {
        const parsed = JSON.parse(user);
        parsed.preferred_lang = newLang;
        localStorage.setItem('pms_user', JSON.stringify(parsed));
      }
    } catch {}
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return { t, dir, lang, setLang };
}
