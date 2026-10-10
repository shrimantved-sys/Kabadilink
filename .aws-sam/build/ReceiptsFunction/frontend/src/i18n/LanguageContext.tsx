import React, { createContext, useContext, useState, useEffect } from "react";
import enTranslations from "./en.json";
import hiTranslations from "./hi.json";

export type Language = "en" | "hi";

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("kabadilink_lang") as Language) || "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("kabadilink_lang", newLang);
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "hi" : "en");
  };

  const dictionary = lang === "hi" ? hiTranslations : enTranslations;

  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    let current: unknown = dictionary;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return fallback || path;
      }
    }

    return typeof current === "string" ? current : fallback || path;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
