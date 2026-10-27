import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { bn } from "./bn";

const savedLanguage = localStorage.getItem("imunixLanguage");
const user = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
})();

const initialLanguage =
  savedLanguage === "bn" || savedLanguage === "en"
    ? savedLanguage
    : user?.language === "bn"
      ? "bn"
      : "en";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
      },
      lng: initialLanguage,
      fallbackLng: "en",
      supportedLngs: ["en", "bn"],
      ns: ["translation"],
      defaultNS: "translation",
      keySeparator: false,
      nsSeparator: false,
      returnNull: false,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
