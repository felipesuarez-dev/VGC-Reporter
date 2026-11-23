import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { AlertTriangle, CalendarDays, ChevronDown, ExternalLink, FileText, Info, RefreshCw, RotateCcw, Table2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FormatSelector } from "../components/ui/FormatSelector";
import { AboutModal } from "../components/layout/AboutModal";
import { LanguageCombobox } from "../components/layout/LanguageCombobox";
import { useDashboardStore } from "../stores/dashboardStore";
import { useRegulationCatalog, useRegulationStatus } from "../hooks/useRegulationCatalog";
import { regulationLabel } from "../lib/regulations";
import { queryKeys } from "../lib/queryKeys";
import { openExternal } from "../lib/openExternal";
import { TimeZoneSelect } from "../components/layout/TimeZoneSelect";
import { CountrySelect } from "../components/layout/CountrySelect";
import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  useUiStore,
} from "../stores/uiStore";
import { usePlaybackStore } from "../stores/playbackStore";
import { useTypeLabStore } from "../stores/typeLabStore";
import { SyncSettings } from "../components/settings/SyncSettings";
import { LiveScreensSettings } from "../components/settings/LiveScreensSettings";

const LEGACY_INDER_LIVE = "https://www.youtube.com/watch?v=tP09BzCEJqU";

const DEFAULT_LIVE_SCREENS = [
  "https://www.youtube.com/@yuksvgc",
  "https://www.youtube.com/@PlayPokemon",
  "https://www.youtube.com/@WolfeyVGC",
  "https://www.youtube.com/@CybertronVGC",
  "https://www.youtube.com/@JamesBaek",
  "https://www.youtube.com/@PokeAlex",
  "https://www.youtube.com/@Moxie2D",
  "https://www.youtube.com/@PokemonChampions",
  "https://www.youtube.com/@Sekiam",
  "https://www.youtube.com/@IRNemesisTV",
];

function defaultLiveScreens(settings: Record<string, string>): string {
  const configured = settings.live_stream_urls?.trim();
  if (configured) {
    return configured
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter((url) => url && url !== LEGACY_INDER_LIVE)
      .join("\n");
  }
  const legacy = settings.official_stream_url?.trim();
  return [
    DEFAULT_LIVE_SCREENS[0],
    legacy && legacy !== LEGACY_INDER_LIVE
      ? legacy
      : DEFAULT_LIVE_SCREENS[1],
    ...DEFAULT_LIVE_SCREENS.slice(2),
  ]
    .filter((url, index, all) => all.indexOf(url) === index)
    .join("\n");
}

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
  const { t } = useTranslation();
  const format = useDashboardStore((s) => s.favoriteFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const formatPinned = useDashboardStore((s) => s.formatPinned);
  const showArchived = useDashboardStore((s) => s.showArchived);
  const setShowArchived = useDashboardStore((s) => s.setShowArchived);
  const fontSizePx = useUiStore((s) => s.fontSizePx);
  const setFontSizePx = useUiStore((s) => s.setFontSizePx);
  const homeCountry = useUiStore((s) => s.homeCountry);
  const setHomeCountry = useUiStore((s) => s.setHomeCountry);
  const calendarMode = useUiStore((s) => s.calendarMode);
  const setCalendarMode = useUiStore((s) => s.setCalendarMode);
  const calendarPlacement = useUiStore((s) => s.calendarPlacement);
  const setCalendarPlacement = useUiStore((s) => s.setCalendarPlacement);
  const calendarCorner = useUiStore((s) => s.calendarCorner);
  const setCalendarCorner = useUiStore((s) => s.setCalendarCorner);
  const pokedexQuickTables = useUiStore((s) => s.pokedexQuickTables);
  const setPokedexQuickTables = useUiStore((s) => s.setPokedexQuickTables);
  const quickTablesDefaultTab = useUiStore((s) => s.quickTablesDefaultTab);
  const setQuickTablesDefaultTab = useUiStore((s) => s.setQuickTablesDefaultTab);
  const quickTablesMode = useUiStore((s) => s.quickTablesMode);
  const setQuickTablesMode = useUiStore((s) => s.setQuickTablesMode);
  const quickTablesPlacement = useUiStore((s) => s.quickTablesPlacement);
  const setQuickTablesPlacement = useUiStore((s) => s.setQuickTablesPlacement);
  const quickTablesCorner = useUiStore((s) => s.quickTablesCorner);
  const setQuickTablesCorner = useUiStore((s) => s.setQuickTablesCorner);
  const setQuickTablesPosition = useUiStore((s) => s.setQuickTablesPosition);
  const videoContinuity = usePlaybackStore((s) => s.continuity);
  const setVideoContinuity = usePlaybackStore((s) => s.setContinuity);
  const [aboutOpen, setAboutOpen] = useState(false);
  const qc = useQueryClient();
  const { options, active } = useRegulationCatalog();
  const { data: syncStatus } = useRegulationStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [overrides, setOverrides] = useState({
    labmaus: "",
    limitless: "",
    smogon: "",
  });
  const [streamUrls, setStreamUrls] = useState("");

  useEffect(() => {
    void ipc.getSettings().then((settings) => {
      setStreamUrls(defaultLiveScreens(settings));
    });
  }, []);

  const saveStreamUrls = async () => {
    const urls = Array.from(
      new Set(
        streamUrls
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter((url) => url && url !== LEGACY_INDER_LIVE),
      ),
    ).slice(0, 12);
    await ipc.setSetting("live_stream_urls", urls.join("\n"));
    // Keep the old key in sync for older builds that only read it.
    await ipc.setSetting("official_stream_url", urls[0] ?? "");
    await qc.invalidateQueries({ queryKey: queryKeys.liveStreams });
    await qc.invalidateQueries({ queryKey: queryKeys.officialStream });
  };

  useEffect(() => {
    if (!active) return;
    void ipc.getSettings().then((settings) => {
      setOverrides({
        labmaus: settings[`labmaus_name::${active.id}`] ?? "",
        limitless: settings[`limitless_code::${active.id}`] ?? "",
        smogon: settings[`smogon_slug::${active.id}`] ?? "",
      });
    });
  }, [active?.id]);

  const refreshCatalog = async () => {
    setRefreshing(true);
    try {
      await ipc.refreshRegulations(true);
      await qc.invalidateQueries({ queryKey: queryKeys.regulations });
      await qc.invalidateQueries({ queryKey: queryKeys.regulationStatus });
      await qc.invalidateQueries({ queryKey: ["meta"] });
      await qc.invalidateQueries({ queryKey: ["topTeams"] });
      await qc.invalidateQueries({ queryKey: ["trending"] });
    } finally {
      setRefreshing(false);
    }
  };

  const saveOverride = async (kind: "labmaus" | "limitless" | "smogon") => {
    if (!active) return;
    const key =
      kind === "labmaus"
        ? `labmaus_name::${active.id}`
        : kind === "limitless"
          ? `limitless_code::${active.id}`
          : `smogon_slug::${active.id}`;
    await ipc.setSetting(key, overrides[kind]);
    await refreshCatalog();
  };

  const resetAdvanced = async () => {
    if (!active) return;
    await ipc.setSetting(`labmaus_name::${active.id}`, "");
    await ipc.setSetting(`limitless_code::${active.id}`, "");
    await ipc.setSetting(`smogon_slug::${active.id}`, "");
    setOverrides({ labmaus: "", limitless: "", smogon: "" });
    await refreshCatalog();
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

      <SettingsGroup
        title={t("settings.group_general")}
        hint={t("settings.group_general_hint")}
      >
      <section className="card space-y-3">
        <div className="label">{t("settings.language")}</div>
        <LanguageCombobox variant="default" />
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
        <div className="label">{t("settings.timezone")}</div>
        <TimeZoneSelect className="w-full sm:w-80" />
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("settings.timezone_hint")}
        </p>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.home_country")}</div>
        <CountrySelect
          value={homeCountry}
          onChange={setHomeCountry}
          className="w-full sm:w-80"
        />
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("settings.home_country_hint")}
        </p>
      </section>
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.group_widgets")}
        hint={t("settings.group_widgets_hint")}
      >

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} style={{ color: "var(--accent)" }} />
          <div>
            <div className="label">{t("settings.calendar")}</div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {t("settings.calendar_hint")}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="calendar-mode"
              checked={calendarMode === "panel"}
              onChange={() => setCalendarMode("panel")}
            />
            {t("settings.calendar_panel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="calendar-mode"
              checked={calendarMode === "floating"}
              onChange={() => setCalendarMode("floating")}
            />
            {t("settings.calendar_floating")}
          </label>
        </div>
        {calendarMode === "floating" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="calendar-placement"
                  checked={calendarPlacement === "corner"}
                  onChange={() => setCalendarPlacement("corner")}
                />
                {t("settings.calendar_corner")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="calendar-placement"
                  checked={calendarPlacement === "free"}
                  onChange={() => setCalendarPlacement("free")}
                />
                {t("settings.calendar_free")}
              </label>
            </div>
            {calendarPlacement === "corner" && (
              <select
                className="input h-9 w-full sm:w-64"
                value={calendarCorner}
                onChange={(event) =>
                  setCalendarCorner(
                    event.target.value as "bottom-right" | "bottom-left",
                  )
                }
              >
                <option value="bottom-right">{t("settings.calendar_bottom_right")}</option>
                <option value="bottom-left">{t("settings.calendar_bottom_left")}</option>
              </select>
            )}
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <Table2 size={15} style={{ color: "var(--accent)" }} />
          <div>
            <div className="label">{t("settings.quick_tables")}</div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {t("settings.quick_tables_hint")}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            {t("settings.quick_tables_mode")}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="quick-tables-mode"
                checked={quickTablesMode === "panel"}
                onChange={() => setQuickTablesMode("panel")}
              />
              {t("settings.quick_tables_panel")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="quick-tables-mode"
                checked={quickTablesMode === "floating"}
                onChange={() => setQuickTablesMode("floating")}
              />
              {t("settings.quick_tables_floating")}
            </label>
          </div>
        </div>
        {quickTablesMode === "floating" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="quick-tables-placement"
                  checked={quickTablesPlacement === "corner"}
                  onChange={() => setQuickTablesPlacement("corner")}
                />
                {t("settings.calendar_corner")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="quick-tables-placement"
                  checked={quickTablesPlacement === "free"}
                  onChange={() => setQuickTablesPlacement("free")}
                />
                {t("settings.calendar_free")}
              </label>
            </div>
            {quickTablesPlacement === "corner" && (
              <select
                className="input h-9 w-full sm:w-64"
                value={quickTablesCorner}
                onChange={(event) =>
                  setQuickTablesCorner(
                    event.target.value as "bottom-right" | "bottom-left",
                  )
                }
              >
                <option value="bottom-right">{t("settings.calendar_bottom_right")}</option>
                <option value="bottom-left">{t("settings.calendar_bottom_left")}</option>
              </select>
            )}
            <button
              type="button"
              className="btn-ghost h-8 text-[10px]"
              onClick={() => setQuickTablesPosition(null)}
            >
              {t("settings.quick_tables_reset_position")}
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pokedexQuickTables}
            onChange={(event) => setPokedexQuickTables(event.target.checked)}
          />
          {t("settings.quick_tables_show")}
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
              {t("settings.quick_tables_default")}
            </div>
            <select
              className="input h-9 w-48"
              value={quickTablesDefaultTab}
              onChange={(event) =>
                setQuickTablesDefaultTab(
                  event.target.value === "natures" ? "natures" : "types",
                )
              }
            >
              <option value="types">{t("settings.quick_tables_types")}</option>
              <option value="natures">{t("settings.quick_tables_natures")}</option>
            </select>
          </div>
          <button
            type="button"
            className="btn-ghost h-9 text-xs"
            onClick={() => {
              const store = useTypeLabStore.getState();
              store.setTab(quickTablesDefaultTab === "types" ? "table" : "natures");
              store.setOpen(true);
            }}
          >
            {t("settings.quick_tables_open")}
          </button>
        </div>
      </section>
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.group_playback")}
        hint={t("settings.group_playback_hint")}
      >
      <section className="card space-y-2">
        <div className="label">{t("settings.playback")}</div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("settings.playback_hint")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="video-continuity"
              checked={videoContinuity === "stop"}
              onChange={() => setVideoContinuity("stop")}
            />
            {t("settings.playback_stop")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="video-continuity"
              checked={videoContinuity === "mini"}
              onChange={() => setVideoContinuity("mini")}
            />
            {t("settings.playback_mini")}
          </label>
        </div>
      </section>

      <LiveScreensSettings
        value={streamUrls}
        onChange={setStreamUrls}
        onSave={() => saveStreamUrls()}
        defaults={DEFAULT_LIVE_SCREENS}
      />
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.group_data")}
        hint={t("settings.group_data_hint")}
      >
      <section className="card space-y-2">
        <div className="label">{t("settings.preferred_format")}</div>
        <FormatSelector
          value={format}
          favorite={format}
          options={options}
          onChange={(f) => {
            setFavoriteFormat(f);
            setFormat(f);
          }}
          onFavoriteChange={(f) => {
            setFavoriteFormat(f);
            setFormat(f);
          }}
          className="w-full sm:w-72"
        />
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("settings.preferred_format_hint")}
        </p>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="label">{t("regulations.settings_title")}</div>
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              {active ? regulationLabel(t, active) : t("common.loading")}
              {syncStatus?.last_sync
                ? ` · ${t("regulations.last_sync", {
                    date: new Date(syncStatus.last_sync).toLocaleString(),
                  })}`
                : ""}
            </p>
            {active && (
              <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                {t("regulations.eligible_count", { count: active.eligible_count })}
                {` · ${t("regulations.confidence_label", {
                  level: t(`regulations.confidence_${active.confidence}`),
                })}`}
                {active.new_megas.length > 0
                  ? ` · ${t("regulations.new_megas", { count: active.new_megas.length })}`
                  : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => void refreshCatalog()}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "mr-1 animate-spin" : "mr-1"} />
            {t("regulations.refresh")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!formatPinned}
              onChange={(e) => {
                useDashboardStore.setState({ formatPinned: !e.target.checked });
                if (e.target.checked && active) {
                  useDashboardStore.getState().followActive(active.id);
                }
              }}
            />
            {t("regulations.auto_follow")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {t("regulations.show_archived")}
          </label>
        </div>
        {syncStatus?.calendar_pending && (
          <p className="text-[11px]" style={{ color: "var(--warning)" }}>
            {t("regulations.calendar_pending")}
          </p>
        )}
        <details className="group rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--bg-elev-strong)]">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <AlertTriangle size={15} style={{ color: "var(--warning)" }} />
              <span>{t("regulations.advanced")}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--warning) 18%, transparent)",
                  color: "var(--warning)",
                }}
              >
                {t("regulations.advanced_badge")}
              </span>
            </span>
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform duration-200 group-open:rotate-180"
              style={{ color: "var(--text-muted)" }}
            />
          </summary>

          <div
            className="space-y-3 border-t px-3 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]"
              style={{
                borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--warning) 9%, transparent)",
              }}
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: "var(--warning)" }}
              />
              <div className="space-y-1">
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {t("regulations.advanced_warning_title")}
                </p>
                <p style={{ color: "var(--text-muted)" }}>
                  {t("regulations.override_warning")}
                </p>
                <p style={{ color: "var(--text-muted)" }}>
                  {t("regulations.advanced_leave_alone")}
                </p>
              </div>
            </div>

            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {t("regulations.advanced_intro")}
            </p>
            {active && (
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("regulations.advanced_scope", {
                  regulation: regulationLabel(t, active),
                })}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  key: "labmaus" as const,
                  source: "Labmaus",
                  label: t("regulations.override_labmaus"),
                  help: t("regulations.override_labmaus_help"),
                  example: "Regulation Set M-C",
                },
                {
                  key: "limitless" as const,
                  source: "Limitless",
                  label: t("regulations.override_limitless"),
                  help: t("regulations.override_limitless_help"),
                  example: "M-C",
                },
                {
                  key: "smogon" as const,
                  source: "Smogon",
                  label: t("regulations.override_smogon"),
                  help: t("regulations.override_smogon_help"),
                  example: "gen9championsvgc2026regmc",
                },
              ].map((field) => (
                <div
                  key={field.key}
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "color-mix(in srgb, var(--bg) 55%, transparent)",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <label
                        htmlFor={`override-${field.key}`}
                        className="text-xs font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        {field.label}
                      </label>
                      <p
                        className="mt-0.5 text-[11px] leading-snug"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {field.help}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {field.source}
                    </span>
                  </div>
                  <input
                    id={`override-${field.key}`}
                    className="input mt-2 font-mono text-[12px]"
                    placeholder={field.example}
                    value={overrides[field.key]}
                    onChange={(e) =>
                      setOverrides({ ...overrides, [field.key]: e.target.value })
                    }
                    onBlur={() => void saveOverride(field.key)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <p
                    className="mt-1 text-[10px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {t("regulations.advanced_example")}:{" "}
                    <code
                      className="rounded px-1 py-0.5 font-mono"
                      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
                    >
                      {field.example}
                    </code>
                  </p>
                </div>
              ))}
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("regulations.advanced_reset_hint")}
              </p>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => void resetAdvanced()}
                disabled={!overrides.labmaus && !overrides.limitless && !overrides.smogon}
              >
                <RotateCcw size={14} className="mr-1" />
                {t("regulations.reset_advanced")}
              </button>
            </div>
          </div>
        </details>
      </section>
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.group_sync")}
        hint={t("settings.group_sync_hint")}
      >
        <SyncSettings />
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.group_advanced")}
        hint={t("settings.group_advanced_hint")}
      >
      <section className="card space-y-2">
        <div className="label">{t("settings.external_sources")}</div>
        <ul className="space-y-1">
          {EXTERNAL_LINKS.map((link) => (
            <li key={link.key}>
              <button
                onClick={() => void openExternal(link.url)}
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
        <div className="label">{t("settings.diagnostics")}</div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("settings.logs_hint")}
        </p>
        <button
          className="btn-ghost flex items-center gap-2 text-sm"
          onClick={() => {
            void ipc.openLogsFolder();
          }}
        >
          <FileText size={14} />
          {t("settings.open_logs")}
        </button>
      </section>

      <section className="card space-y-2">
        <div className="label">{t("settings.disclaimer_title")}</div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("settings.disclaimer")}
        </p>
      </section>
      </SettingsGroup>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function SettingsGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2 px-1 pt-2">
        <span
          className="mt-1 h-4 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {hint}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
