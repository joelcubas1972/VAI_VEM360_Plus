import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { translations } from './translations';

export type Language = 'es' | 'pt';

type TranslationTable = Record<string, string>;
type TranslationMap = Record<Language, TranslationTable>;

export function useTranslation() {
  const [language, setLanguageState] = useState<Language>('es');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved === 'es' || saved === 'pt') {
        setLanguageState(saved as Language);
      }
      setLoading(false);
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  };

  const t = (key: string): string => {
    if (loading) return key;
    const table = (translations as TranslationMap)[language] || {};
    return String((table as TranslationTable)[key] || key);
  };

  return { t, language, setLanguage, loading };
}