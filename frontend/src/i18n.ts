import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";

const SUPPORTED = ["es", "en", "pt", "it", "fr"] as const;
type Supported = (typeof SUPPORTED)[number];

function resolveLang(raw: string | null): Supported {
  if (!raw) return "es";
  const head = raw.slice(0, 2).toLowerCase();
  return (SUPPORTED as readonly string[]).includes(head)
    ? (head as Supported)
    : "es";
}

const saved =
  typeof window !== "undefined" ? resolveLang(localStorage.getItem("lang")) : "es";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
    it: { translation: it },
    fr: { translation: fr },
  },
  lng: saved,
  fallbackLng: "en",
  supportedLngs: [...SUPPORTED],
  interpolation: { escapeValue: false },
});

export default i18n;
