import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  Languages,
  LayoutGrid,
  ListVideo,
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Table2,
  Wrench,
} from "lucide-react";
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
import { useTypeLabStore } from "../stores/typeLabStore";
import { usePlaybackStore } from "../stores/playbackStore";
import { SyncSettings } from "../components/settings/SyncSettings";
import { LiveScreensSettings } from "../components/settings/LiveScreensSettings";
import { ShortcutRecorder } from "../components/settings/ShortcutRecorder";
import {
  SegmentedControl,
  ToggleSwitch,
} from "../components/ui/FormControls";
import { isAndroidApp } from "../lib/platform";

const LEGACY_INDER_LIVE = "https://www.youtube.com/watch?v=tP09BzCEJqU";

const DEFAULT_LIVE_SCREENS = [
  "https://www.youtube.com/@yuksvgc",
  "https://www.youtube.com/@PlayPokemon",
  "https://www.youtube.com/@WolfeyVGC",
  "https://www.youtube.com/@CybertronVGC",
  "https://www.youtube.com/@JamesBaek",
  "https://www.youtube.com/@PokeAlex",
  "https://www.youtube.com/@Moxie2D",
  "https://www.youtube.com/@MoxieBoosted",
  "https://www.youtube.com/@BlackStormGamesVGC",
  "https://www.youtube.com/@PokemonChampions",
  "https://www.youtube.com/@Sekiam",
  "https://www.youtube.com/@THATSAplusONE",
];

function defaultLiveScreens(settings: Record<string, string>): string {
  const configured = settings.live_stream_urls?.trim();
  if (configured) {
    const cleaned = configured
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter((url) => url && url !== LEGACY_INDER_LIVE)
      .join("\n");
    if (cleaned) return cleaned;
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

const SETTINGS_GROUP_IDS = [
  "general",
  "widgets",
  "playback",
  "data",
  "sync",
  "advanced",
] as const;

const SETTINGS_CARD_IDS = [
  "language",
  "font_size",
  "timezone",
  "home_country",
  "floating_widgets",
  "calendar",
  "quick_tables",
  "mobile_nav",
  "playback_mode",
  "live_screens",
  "preferred_format",
  "regulations",
  "sync",
  "external_sources",
  "diagnostics",
  "disclaimer",
] as const;

const EXTERNAL_LINKS: { key: string; url: string }[] = [
  { key: "open_labmaus", url: "https://labmaus.net/" },
  { key: "open_pikalytics", url: "https://www.pikalytics.com/" },
  {
    key: "open_pokemonzone",
    url: "https://www.pokemon-zone.com/champions/tournaments/",
  },
  {
    key: "open_pokebase",
    url: "https://pokebase.app/pokemon-champions/tournaments",
  },
  { key: "open_pokedata", url: "https://www.pokedata.ovh/standings2/" },
  { key: "open_porygonlabs", url: "https://porygonlabs.com/" },
  { key: "open_championslab", url: "https://championslab.xyz/" },
  {
    key: "open_limitless",
    url: "https://play.limitlesstcg.com/tournaments?game=VGC",
  },
];

export function Settings() {
  const { t } = useTranslation();
  const android = isAndroidApp();
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
  const continuity = usePlaybackStore((s) => s.continuity);
  const setContinuity = usePlaybackStore((s) => s.setContinuity);
  const floatingWidgetsGrouped = useUiStore((s) => s.floatingWidgetsGrouped);
  const setFloatingWidgetsGrouped = useUiStore(
    (s) => s.setFloatingWidgetsGrouped,
  );
  const floatingWidgetsCorner = useUiStore((s) => s.floatingWidgetsCorner);
  const setFloatingWidgetsCorner = useUiStore((s) => s.setFloatingWidgetsCorner);
  const quickTablesMode = useUiStore((s) => s.quickTablesMode);
  const setQuickTablesMode = useUiStore((s) => s.setQuickTablesMode);
  const quickTablesDefaultTab = useUiStore((s) => s.quickTablesDefaultTab);
  const setQuickTablesDefaultTab = useUiStore((s) => s.setQuickTablesDefaultTab);
  const quickTablesShortcut = useUiStore((s) => s.quickTablesShortcut);
  const setQuickTablesShortcut = useUiStore((s) => s.setQuickTablesShortcut);
  const mobileNavEnabled = useUiStore((s) => s.mobileNavEnabled);
  const setMobileNavEnabled = useUiStore((s) => s.setMobileNavEnabled);
  const mobileNavPlacement = useUiStore((s) => s.mobileNavPlacement);
  const setMobileNavPlacement = useUiStore((s) => s.setMobileNavPlacement);
  const setMobileNavPosition = useUiStore((s) => s.setMobileNavPosition);
  const settingsCollapsed = useUiStore((s) => s.settingsCollapsed);
  const setSettingsCollapsed = useUiStore((s) => s.setSettingsCollapsed);
  const setAllSettingsCollapsed = useUiStore(
    (s) => s.setAllSettingsCollapsed,
  );
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

  const allCollapseIds = [
    ...SETTINGS_GROUP_IDS.map((id) => `group:${id}`),
    ...SETTINGS_CARD_IDS.map((id) => `card:${id}`),
  ];
  const anySettingsOpen = allCollapseIds.some((id) => !settingsCollapsed[id]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-8 text-[11px]"
            onClick={() => setAllSettingsCollapsed(allCollapseIds, anySettingsOpen)}
            title={anySettingsOpen ? t("feed.collapse_all") : t("feed.expand_all")}
          >
            {anySettingsOpen ? (
              <ChevronsDownUp size={13} className="mr-1" />
            ) : (
              <ChevronsUpDown size={13} className="mr-1" />
            )}
            {anySettingsOpen ? t("feed.collapse_all") : t("feed.expand_all")}
          </button>
          <button className="btn-ghost h-8 text-[11px]" onClick={() => setAboutOpen(true)}>
            <Info size={14} className="mr-1" />
            {t("about.title")}
          </button>
        </div>
      </header>

      <SettingsGroup
        id="general"
        icon={<Settings2 size={15} />}
        title={t("settings.group_general")}
        hint={t("settings.group_general_hint")}
      >
      <SettingsCard
        id="language"
        icon={<Languages size={15} />}
        title={t("settings.language")}
      >
        <LanguageCombobox variant="default" />
      </SettingsCard>

      <SettingsCard
        id="font_size"
        icon={<LayoutGrid size={15} />}
        title={t("settings.font_size")}
        hint={t("settings.font_size_hint")}
      >
        <div>
          <div className="flex items-baseline justify-end">
            <span
              className="rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-elev-strong)",
                color: "var(--text)",
              }}
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
            style={
              {
                "--slider-progress": `${
                  ((fontSizePx - FONT_SIZE_MIN) /
                    (FONT_SIZE_MAX - FONT_SIZE_MIN)) *
                  100
                }%`,
              } as CSSProperties
            }
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
        </div>
      </SettingsCard>

      <SettingsCard
        id="timezone"
        icon={<Clock size={15} />}
        title={t("settings.timezone")}
        hint={t("settings.timezone_hint")}
      >
        <TimeZoneSelect className="w-full sm:w-80" />
      </SettingsCard>

      <SettingsCard
        id="home_country"
        icon={<Globe2 size={15} />}
        title={t("settings.home_country")}
        hint={t("settings.home_country_hint")}
      >
        <CountrySelect
          value={homeCountry}
          onChange={setHomeCountry}
          className="w-full sm:w-80"
        />
      </SettingsCard>
      </SettingsGroup>

      <SettingsGroup
        id="widgets"
        icon={<LayoutGrid size={15} />}
        title={t("settings.group_widgets")}
        hint={t("settings.group_widgets_hint")}
      >

      <SettingsCard
        id="floating_widgets"
        icon={<LayoutGrid size={15} />}
        title={t("settings.floating_widgets")}
        hint={t("settings.floating_widgets_hint")}
      >
        <ToggleSwitch
          checked={floatingWidgetsGrouped}
          onChange={setFloatingWidgetsGrouped}
          label={t("settings.widgets_grouped")}
          hint={t("settings.widgets_grouped_hint")}
        />
        <SegmentedControl
          value={floatingWidgetsCorner}
          onChange={(value) => setFloatingWidgetsCorner(value)}
          label={t("settings.widgets_corner")}
          options={[
            {
              value: "bottom-right",
              label: t("settings.calendar_bottom_right"),
            },
            {
              value: "bottom-left",
              label: t("settings.calendar_bottom_left"),
            },
          ]}
        />
      </SettingsCard>

      <SettingsCard
        id="calendar"
        icon={<CalendarDays size={15} />}
        title={t("settings.calendar")}
        hint={t("settings.calendar_hint")}
      >
        <SegmentedControl
          value={calendarMode}
          onChange={(value) => setCalendarMode(value)}
          options={[
            { value: "titlebar", label: t("settings.calendar_titlebar") },
            { value: "floating", label: t("settings.calendar_floating") },
          ]}
          hint={
            calendarMode === "floating"
              ? t("settings.calendar_rail_hint")
              : t("settings.calendar_titlebar_hint")
          }
        />
      </SettingsCard>

      <SettingsCard
        id="quick_tables"
        icon={<Table2 size={15} />}
        title={t("settings.quick_tables")}
        hint={t("settings.quick_tables_hint")}
      >
        <SegmentedControl
          value={quickTablesMode}
          onChange={(value) => setQuickTablesMode(value)}
          label={t("settings.quick_tables_mode")}
          options={[
            { value: "titlebar", label: t("settings.quick_tables_titlebar_mode") },
            { value: "floating", label: t("settings.quick_tables_floating_mode") },
          ]}
          hint={
            quickTablesMode === "floating"
              ? t("settings.quick_tables_floating_hint")
              : t("settings.quick_tables_titlebar_hint")
          }
        />
        <SegmentedControl
          fullWidth
          value={quickTablesDefaultTab}
          onChange={(value) => setQuickTablesDefaultTab(value)}
          label={t("settings.quick_tables_default")}
          options={[
            { value: "types", label: t("settings.quick_tables_types") },
            { value: "natures", label: t("settings.quick_tables_natures") },
          ]}
        />
        <button
          type="button"
          className="btn-ghost h-9 self-start text-xs"
          onClick={() => {
            const store = useTypeLabStore.getState();
            store.setTab(quickTablesDefaultTab === "types" ? "table" : "natures");
            store.setOpen(true);
          }}
        >
          {t("settings.quick_tables_open")}
        </button>
        <div>
          <div
            className="mb-1 text-[10px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t("settings.quick_tables_shortcut")}
          </div>
          <ShortcutRecorder
            value={quickTablesShortcut}
            onChange={setQuickTablesShortcut}
          />
        </div>
      </SettingsCard>

      {android && (
      <SettingsCard
        id="mobile_nav"
        icon={<Smartphone size={15} />}
        title={t("settings.mobile_nav")}
        hint={t("settings.mobile_nav_hint")}
      >
        <ToggleSwitch
          checked={mobileNavEnabled}
          onChange={setMobileNavEnabled}
          label={t("settings.mobile_nav_enabled")}
        />
        {mobileNavEnabled && (
          <div className="space-y-2">
            <SegmentedControl
              value={mobileNavPlacement}
              onChange={(value) => setMobileNavPlacement(value)}
              label={t("settings.mobile_nav_placement")}
              options={[
                { value: "fixed", label: t("settings.mobile_nav_fixed") },
                { value: "free", label: t("settings.mobile_nav_free") },
              ]}
            />
            <button
              type="button"
              className="btn-ghost h-8 text-[10px]"
              onClick={() => setMobileNavPosition(null)}
            >
              {t("settings.mobile_nav_reset")}
            </button>
          </div>
        )}
      </SettingsCard>
      )}
      </SettingsGroup>

      <SettingsGroup
        id="playback"
        icon={<MonitorPlay size={15} />}
        title={t("settings.group_playback")}
        hint={t("settings.group_playback_hint")}
      >
      <SettingsCard
        id="playback_mode"
        icon={<MonitorPlay size={15} />}
        title={t("settings.playback")}
        hint={t("settings.playback_hint")}
      >
        <SegmentedControl
          value={continuity}
          onChange={(value) => setContinuity(value)}
          label={t("settings.playback")}
          options={[
            { value: "stop", label: t("settings.playback_stop") },
            { value: "mini", label: t("settings.playback_mini") },
          ]}
        />
      </SettingsCard>
      <LiveScreensSettings
        value={streamUrls}
        onChange={setStreamUrls}
        onSave={() => saveStreamUrls()}
        defaults={DEFAULT_LIVE_SCREENS}
      />
      </SettingsGroup>

      <SettingsGroup
        id="data"
        icon={<Database size={15} />}
        title={t("settings.group_data")}
        hint={t("settings.group_data_hint")}
      >
      <SettingsCard
        id="preferred_format"
        icon={<ShieldCheck size={15} />}
        title={t("settings.preferred_format")}
        hint={t("settings.preferred_format_hint")}
      >
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
      </SettingsCard>

      <SettingsCard
        id="regulations"
        icon={<ShieldCheck size={15} />}
        title={t("regulations.settings_title")}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
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
          <ToggleSwitch
            checked={!formatPinned}
            onChange={(checked) => {
              useDashboardStore.setState({ formatPinned: !checked });
              if (checked && active) {
                useDashboardStore.getState().followActive(active.id);
              }
            }}
            label={t("regulations.auto_follow")}
          />
          <ToggleSwitch
            checked={showArchived}
            onChange={setShowArchived}
            label={t("regulations.show_archived")}
          />
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
      </SettingsCard>
      </SettingsGroup>

      <SettingsGroup
        id="sync"
        icon={<ShieldCheck size={15} />}
        title={t("settings.group_sync")}
        hint={t("settings.group_sync_hint")}
      >
        <SyncSettings />
      </SettingsGroup>

      <SettingsGroup
        id="advanced"
        icon={<Wrench size={15} />}
        title={t("settings.group_advanced")}
        hint={t("settings.group_advanced_hint")}
      >
      <SettingsCard
        id="external_sources"
        icon={<ExternalLink size={15} />}
        title={t("settings.external_sources")}
      >
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
        <p
          className="mt-3 text-[10px] leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          {t("settings.external_sources_disclaimer")}
        </p>
      </SettingsCard>

      <SettingsCard
        id="diagnostics"
        icon={<FileText size={15} />}
        title={t("settings.diagnostics")}
        hint={t("settings.logs_hint")}
      >
        <button
          className="btn-ghost flex items-center gap-2 text-sm"
          onClick={() => {
            void ipc.openLogsFolder();
          }}
        >
          <FileText size={14} />
          {t("settings.open_logs")}
        </button>
      </SettingsCard>

      <SettingsCard
        id="disclaimer"
        icon={<AlertTriangle size={15} />}
        title={t("settings.disclaimer_title")}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("settings.disclaimer")}
        </p>
      </SettingsCard>
      </SettingsGroup>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function SettingsGroup({
  id,
  icon,
  title,
  hint,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const collapsed = useUiStore(
    (s) => s.settingsCollapsed[`group:${id}`] ?? false,
  );
  const setCollapsed = useUiStore((s) => s.setSettingsCollapsed);
  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-start gap-2 rounded-xl px-1 pt-2 text-left transition-colors hover:bg-[var(--bg-elev)]"
        onClick={() => setCollapsed(`group:${id}`, !collapsed)}
        aria-expanded={!collapsed}
        title={collapsed ? t("feed.expand") : t("feed.collapse")}
      >
        <span
          className="mt-1 h-4 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: "var(--text)" }}>
            {title}
          </span>
          <span className="block text-[10px]" style={{ color: "var(--text-dim)" }}>
            {hint}
          </span>
        </span>
        <span
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {!collapsed && <div className="space-y-3">{children}</div>}
    </section>
  );
}

function SettingsCard({
  id,
  icon,
  title,
  hint,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const collapsed = useUiStore(
    (s) => s.settingsCollapsed[`card:${id}`] ?? false,
  );
  const setCollapsed = useUiStore((s) => s.setSettingsCollapsed);
  return (
    <section
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-elev) 85%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 p-4 text-left transition-colors hover:bg-[var(--bg-elev-strong)]"
        onClick={() => setCollapsed(`card:${id}`, !collapsed)}
        aria-expanded={!collapsed}
        title={collapsed ? t("feed.expand") : t("feed.collapse")}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </span>
          {hint && (
            <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-muted)" }}>
              {hint}
            </span>
          )}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {!collapsed && (
        <div className="settings-card-body space-y-3 px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}
