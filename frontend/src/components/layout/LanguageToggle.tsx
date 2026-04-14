import { useTranslation } from "react-i18next";
import { ipc } from "../../lib/ipc";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith("es") ? "es" : "en";

  const toggle = async () => {
    const next = current === "es" ? "en" : "es";
    await i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
    try {
      await ipc.setSetting("language", next);
    } catch {
      /* settings table may not exist on first launch; safe to ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded border px-2 py-0.5 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--bg-elev-strong)]"
      style={{
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
      aria-label="Toggle language"
    >
      {current === "es" ? "ES | en" : "EN | es"}
    </button>
  );
}
