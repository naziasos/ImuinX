import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import i18n from "./i18n";
import { en } from "./en";
import { bn } from "./bn";
import { api } from "../services/api";

const LanguageContext = createContext(null);
const STORAGE_KEY = "imunixLanguage";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getInitialLanguage = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "bn" || saved === "en") return saved;

  const user = getStoredUser();
  return user?.language === "bn" ? "bn" : "en";
};

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const originalAttrs = useRef(new WeakMap());
  const translating = useRef(false);

  const t = useCallback((key, options = {}) => {
    return i18n.t(key, {
      defaultValue: key,
      ...options,
    });
  }, []);

  const translateValue = useCallback((value) => {
    if (!value || !value.trim()) return value;

    // Accept either the English source text or an already-translated Bangla
    // value. This lets the app switch back from Bangla to English safely.
    if (Object.prototype.hasOwnProperty.call(en, value)) {
      return i18n.t(value, { defaultValue: value });
    }

    const englishKey = Object.keys(bn).find((key) => bn[key] === value);
    if (englishKey) {
      return i18n.t(englishKey, { defaultValue: englishKey });
    }

    return value;
  }, []);

  // Compatibility translation for the existing screens.
  // IMPORTANT: this is intentionally limited to newly-added DOM nodes and
  // never observes characterData/attribute changes, so it cannot loop with React.
  const translateTextNode = useCallback(
    (node) => {
      if (!node?.nodeValue?.trim()) return;
      const parent = node.parentElement;
      if (!parent || parent.closest("[data-i18n-ignore='true']")) return;

      const translated = translateValue(node.nodeValue);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    },
    [translateValue]
  );

  const translateElement = useCallback(
    (element) => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      if (element.closest("[data-i18n-ignore='true']")) return;

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateTextNode(node);

      if (!originalAttrs.current.has(element)) {
        originalAttrs.current.set(element, {
          placeholder: element.getAttribute("placeholder"),
          title: element.getAttribute("title"),
          "aria-label": element.getAttribute("aria-label"),
          alt: element.getAttribute("alt"),
        });
      }

      const source = originalAttrs.current.get(element);
      for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
        if (source[attr]) {
          const translated = translateValue(source[attr]);
          if (element.getAttribute(attr) !== translated) {
            element.setAttribute(attr, translated);
          }
        }
      }
    },
    [translateTextNode, translateValue]
  );

  const translatePage = useCallback(() => {
    if (!document.body || translating.current) return;

    translating.current = true;
    try {
      translateElement(document.body);
    } finally {
      translating.current = false;
    }
  }, [translateElement]);

  const persistProfileLanguage = useCallback(async (nextLanguage) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");

    if (!token) return;

    try {
      const { data } = await api.patch("/auth/profile", {
        language: nextLanguage,
      });

      if (data.profile) {
        const user = getStoredUser();
        const updatedUser = {
          ...(user || {}),
          ...data.profile,
          language: nextLanguage,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(
          new CustomEvent("imunix-user-updated", { detail: updatedUser })
        );
      }
    } catch {
      // localStorage remains the fallback when the profile request fails.
    }
  }, []);

  const setLanguage = useCallback(
    (nextLanguage) => {
      if (nextLanguage !== "en" && nextLanguage !== "bn") return;

      setLanguageState(nextLanguage);
      localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
      void i18n.changeLanguage(nextLanguage);

      const user = getStoredUser();
      if (user) {
        const updatedUser = { ...user, language: nextLanguage };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(
          new CustomEvent("imunix-user-updated", { detail: updatedUser })
        );
      }

      void persistProfileLanguage(nextLanguage);
    },
    [persistProfileLanguage]
  );

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
    if (i18n.language !== language) void i18n.changeLanguage(language);
    translatePage();
  }, [language, translatePage]);

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const next = event.detail?.language;
      if (next === "en" || next === "bn") {
        setLanguageState(next);
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
        void i18n.changeLanguage(next);
      }
    };

    window.addEventListener("imunix-user-updated", handleUserUpdated);
    return () => window.removeEventListener("imunix-user-updated", handleUserUpdated);
  }, []);

  useEffect(() => {
    // Translate newly mounted React content only.
    // We do NOT observe characterData or attributes, avoiding the previous
    // MutationObserver -> DOM update -> MutationObserver infinite loop.
    const observer = new MutationObserver((mutations) => {
      if (translating.current) return;

      translating.current = true;
      try {
        for (const mutation of mutations) {
          for (const addedNode of mutation.addedNodes) {
            if (addedNode.nodeType === Node.TEXT_NODE) {
              translateTextNode(addedNode);
            } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
              translateElement(addedNode);
            }
          }
        }
      } finally {
        translating.current = false;
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [translateElement, translateTextNode]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      availableLanguages: [
        { code: "en", label: "English" },
        { code: "bn", label: "বাংলা" },
      ],
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export default LanguageProvider;
