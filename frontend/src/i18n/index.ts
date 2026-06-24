import en from './en';
import ar from './ar';

export type TranslationKey = string;

const translations: Record<string, Record<string, any>> = { en, ar };

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = current[key];
    if (current === undefined || current === null) return path;
  }
  return typeof current === 'string' ? current : path;
}

export function getCurrentLang(): string {
  try {
    const user = localStorage.getItem('pms_user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed?.preferredLang) return parsed.preferredLang;
    }
  } catch {}
  return localStorage.getItem('pms_lang') || 'en';
}

export function setDocumentDirection(lang: string) {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export function t(key: string, lang?: string): string {
  const currentLang = lang || getCurrentLang();
  const langData = translations[currentLang];
  if (!langData) return key;
  return getNestedValue(langData, key);
}

export { en, ar };
