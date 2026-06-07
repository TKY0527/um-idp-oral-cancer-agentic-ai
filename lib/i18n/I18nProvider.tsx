"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DICT, type DictKey, type Lang } from "@/lib/i18n/dictionary";

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => undefined,
  t: (k) => DICT[k]?.en ?? k,
});

const STORAGE_KEY = "oralscan_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "bm") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const t = (key: DictKey): string => {
    const entry = DICT[key];
    if (!entry) return String(key);
    return entry[lang] ?? entry.en;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
