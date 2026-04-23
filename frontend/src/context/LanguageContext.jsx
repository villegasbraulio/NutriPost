import { useEffect, useState } from "react";

import { LanguageContext } from "./LanguageContextValue";

const STORAGE_KEY = "nutripost-language";

function resolveLanguage(value) {
  return value === "es" ? "es" : "en";
}

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (storedLanguage === "es" || storedLanguage === "en") {
    return storedLanguage;
  }

  return window.navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    const resolvedLanguage = resolveLanguage(language);
    window.localStorage.setItem(STORAGE_KEY, resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  }, [language]);

  const setLanguage = (value) => {
    setLanguageState(resolveLanguage(value));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isSpanish: language === "es",
        locale: language === "es" ? "es-AR" : "en-US",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
