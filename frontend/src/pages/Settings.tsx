import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FormatSelector } from "../components/ui/FormatSelector";
import { AboutModal } from "../components/layout/AboutModal";
import { useDashboardStore } from "../stores/dashboardStore";
import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  useUiStore,
} from "../stores/uiStore";

const EXTERNAL_LINKS: { key: string; url: string }[] = [
  { key: "open_labmaus", url: "https://labmaus.net/" },
  { key: "open_pikalytics", url: "https://www.pikalytics.com/" },
  { key: "open_pokemonzone", url: "https://pokemon-zone.com/" },
  { key: "open_porygonlabs", url: "https://porygonlabs.com/" },
  { key: "open_championslab", url: "https://championslab.xyz/" },
  {
    key: "open_limitless",
    url: "https://play.limitlesstcg.com/tournaments?game=VGC",
  },
];

export function Settings() {
  const { t, i18n } = useTranslation();
  const format = useDashboardStore((s) => s.favoriteFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const fontSizePx = useUiStore((s) => s.fontSizePx);
  const setFontSizePx = useUiStore((s) => s.setFontSizePx);
  const [aboutOpen, setAboutOpen] = useState(false);

  const open = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <button className="btn-ghost" onClick={() => setAboutOpen(true)}>
          <Info size={14} className="mr-1" />
          {t("about.title")}
        </button>
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

      <section className="card space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="font-size-slider">
              {t("settings.font_size")}
            </label>
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--text-muted)" }}
              aria-live="polite"
            >
              {fontSizePx}px
            </span>
          </div>
          <input
            id="font-size-slider"
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={fontSizePx}
            onChange={(e) => setFontSizePx(Number(e.target.value))}
            className="font-size-slider mt-2 w-full"
          />
          <div
            className="mt-1 flex items-center justify-between text-[10px]"
            style={{ color: "var(--text-dim)" }}
          >
            <span>{t("settings.font_size_small")}</span>
            <button
              type="button"
              className="btn-ghost px-2 py-0.5 text-[10px]"
              onClick={() => setFontSizePx(FONT_SIZE_DEFAULT)}
            >
              {t("settings.font_size_reset")}
            </button>
            <span>{t("settings.font_size_large")}</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
            {t("settings.font_size_hint")}
          </p>
        </div>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.preferred_format")}</div>
        <FormatSelector
          value={format}
          favorite={format}
          onChange={(f) => {
            setFavoriteFormat(f);
            setFormat(f);
          }}
          onFavoriteChange={(f) => {
            setFavoriteFormat(f);
            setFormat(f);
          }}
          className="w-72"
        />
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("settings.preferred_format_hint")}
        </p>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.external_sources")}</div>
        <ul className="space-y-1">
          {EXTERNAL_LINKS.map((link) => (
            <li key={link.key}>
              <button
                onClick={() => open(link.url)}
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--accent)" }}
              >
                <ExternalLink size={14} />
                {t(`settings.${link.key}`)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.disclaimer_title")}</div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("settings.disclaimer")}
        </p>
      </section>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
