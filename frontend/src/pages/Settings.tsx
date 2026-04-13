import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

const EXTERNAL_LINKS: { key: string; url: string }[] = [
  { key: "open_pikalytics", url: "https://www.pikalytics.com/" },
  { key: "open_pokemonzone", url: "https://pokemon-zone.com/" },
  { key: "open_porygonlabs", url: "https://porygonlabs.com/" },
  { key: "open_championslab", url: "https://championslab.xyz/" },
  { key: "open_limitless", url: "https://play.limitlesstcg.com/tournaments?game=VGC" },
];

export function Settings() {
  const { t, i18n } = useTranslation();

  const open = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      </header>

      <section className="card space-y-3">
        <div className="label">{t("settings.language")}</div>
        <div className="flex gap-2">
          <button
            className={i18n.language === "es" ? "btn-primary" : "btn-ghost"}
            onClick={() => i18n.changeLanguage("es")}
          >
            {t("settings.spanish")}
          </button>
          <button
            className={i18n.language === "en" ? "btn-primary" : "btn-ghost"}
            onClick={() => i18n.changeLanguage("en")}
          >
            {t("settings.english")}
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.active_format")}</div>
        <div className="text-sm text-slate-200">Regulation M-A</div>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.external_sources")}</div>
        <ul className="space-y-1">
          {EXTERNAL_LINKS.map((link) => (
            <li key={link.key}>
              <button
                onClick={() => open(link.url)}
                className="flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200"
              >
                <ExternalLink size={14} />
                {t(`settings.${link.key}`)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
