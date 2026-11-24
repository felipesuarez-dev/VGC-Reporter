import { create } from "zustand";
import { persist } from "zustand/middleware";
import { systemCountry } from "../lib/countries";

export type Theme =
  | "system"
  | "gengar"
  | "clefable"
  | "incineroar"
  | "tyranitar"
  | "milotic"
  | "sneasler"
  | "umbreon"
  | "zekrom"
  | "reshiram";

export const ALL_THEMES: Theme[] = [
  "system",
  "clefable",
  "gengar",
  "incineroar",
  "tyranitar",
  "milotic",
  "sneasler",
  "umbreon",
  "zekrom",
  "reshiram",
];

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 16;

export const SIDEBAR_WIDTH_MIN = 280;
export const SIDEBAR_WIDTH_MAX = 440;
export const SIDEBAR_WIDTH_DEFAULT = 300;

function clampFontSize(px: number): number {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(px)));
}

function clampSidebarWidth(px: number): number {
  return Math.max(
    SIDEBAR_WIDTH_MIN,
    Math.min(SIDEBAR_WIDTH_MAX, Math.round(px)),
  );
}

interface UiState {
  theme: Theme;
  timeZone: string;
  homeCountry: string;
  /** Upcoming tournament filter; empty array means every country. */
  upcomingCountries: string[];
  /** Starred country shown first in the upcoming country picker. */
  favoriteUpcomingCountry: string | null;
  /** City filter keys (`country|city`); empty array means every city. */
  upcomingCities: string[];
  sidebarCollapsed: boolean;
  sidebarWidthPx: number;
  fontSizePx: number;
  settingsCollapsed: Record<string, boolean>;
  confirmAllTopTeams: boolean;
  confirmLargeMdExport: boolean;
  /** Live screens hidden from the player but kept in the configured list. */
  hiddenLiveScreens: string[];
  calendarMode: "titlebar" | "floating";
  calendarPlacement: "corner" | "free";
  calendarCorner: "bottom-right" | "bottom-left";
  calendarPosition: { x: number; y: number } | null;
  floatingWidgetsGrouped: boolean;
  floatingWidgetsCorner: "bottom-right" | "bottom-left";
  quickTablesMode: "titlebar" | "floating";
  quickTablesDefaultTab: "types" | "natures";
  quickTablesPlacement: "corner" | "free";
  quickTablesCorner: "bottom-right" | "bottom-left";
  quickTablesPosition: { x: number; y: number } | null;
  quickTablesShortcut: string;
  mobileNavEnabled: boolean;
  mobileNavPlacement: "fixed" | "free";
  mobileNavPosition: { x: number; y: number } | null;
  setTheme: (theme: Theme) => void;
  setTimeZone: (timeZone: string) => void;
  setHomeCountry: (country: string) => void;
  setUpcomingCountries: (countries: string[]) => void;
  setFavoriteUpcomingCountry: (country: string | null) => void;
  setUpcomingCities: (cities: string[]) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidthPx: (px: number) => void;
  setFontSizePx: (px: number) => void;
  setSettingsCollapsed: (id: string, collapsed: boolean) => void;
  setAllSettingsCollapsed: (ids: string[], collapsed: boolean) => void;
  setConfirmAllTopTeams: (v: boolean) => void;
  setConfirmLargeMdExport: (v: boolean) => void;
  toggleLiveScreenHidden: (url: string) => void;
  setCalendarMode: (mode: "titlebar" | "floating") => void;
  setCalendarPlacement: (placement: "corner" | "free") => void;
  setCalendarCorner: (corner: "bottom-right" | "bottom-left") => void;
  setCalendarPosition: (position: { x: number; y: number } | null) => void;
  setFloatingWidgetsGrouped: (grouped: boolean) => void;
  setFloatingWidgetsCorner: (corner: "bottom-right" | "bottom-left") => void;
  setQuickTablesMode: (mode: "titlebar" | "floating") => void;
  setQuickTablesDefaultTab: (tab: "types" | "natures") => void;
  setQuickTablesPlacement: (placement: "corner" | "free") => void;
  setQuickTablesCorner: (corner: "bottom-right" | "bottom-left") => void;
  setQuickTablesPosition: (position: { x: number; y: number } | null) => void;
  setQuickTablesShortcut: (shortcut: string) => void;
  setMobileNavEnabled: (enabled: boolean) => void;
  setMobileNavPlacement: (placement: "fixed" | "free") => void;
  setMobileNavPosition: (position: { x: number; y: number } | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      timeZone: "system",
      homeCountry: systemCountry(),
      upcomingCountries: [systemCountry()],
      favoriteUpcomingCountry: null,
      upcomingCities: [],
      sidebarCollapsed: false,
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      fontSizePx: FONT_SIZE_DEFAULT,
      settingsCollapsed: {},
      confirmAllTopTeams: true,
      confirmLargeMdExport: true,
      hiddenLiveScreens: [],
      calendarMode: "titlebar",
      calendarPlacement: "corner",
      calendarCorner: "bottom-right",
      calendarPosition: null,
      floatingWidgetsGrouped: true,
      floatingWidgetsCorner: "bottom-right",
      quickTablesMode: "floating",
      quickTablesDefaultTab: "types",
      quickTablesPlacement: "corner",
      quickTablesCorner: "bottom-right",
      quickTablesPosition: null,
      quickTablesShortcut: "Ctrl+T",
      mobileNavEnabled: true,
      mobileNavPlacement: "fixed",
      mobileNavPosition: null,
      setTheme: (theme) => set({ theme }),
      setTimeZone: (timeZone) => set({ timeZone }),
      setHomeCountry: (homeCountry) =>
        set((state) => {
          const followedHome =
            state.upcomingCountries.length === 0 ||
            (state.upcomingCountries.length === 1 &&
              state.upcomingCountries[0] === state.homeCountry);
          return {
            homeCountry,
            upcomingCountries: followedHome
              ? [homeCountry]
              : state.upcomingCountries,
            upcomingCities: followedHome ? [] : state.upcomingCities,
          };
        }),
      setUpcomingCountries: (countries) =>
        set((state) => {
          const next = [
            ...new Set(
              countries
                .filter((code) => code && code.length === 2)
                .map((code) => code.toUpperCase()),
            ),
          ];
          const allowed = new Set(next);
          return {
            upcomingCountries: next,
            upcomingCities: next.length
              ? state.upcomingCities.filter((key) => {
                  const country = key.slice(0, key.indexOf("|")) || null;
                  return !country || allowed.has(country);
                })
              : state.upcomingCities,
          };
        }),
      setFavoriteUpcomingCountry: (favoriteUpcomingCountry) =>
        set({
          favoriteUpcomingCountry:
            favoriteUpcomingCountry && favoriteUpcomingCountry.length === 2
              ? favoriteUpcomingCountry.toUpperCase()
              : null,
        }),
      setUpcomingCities: (cities) =>
        set({
          upcomingCities: [
            ...new Set(
              cities
                .map((key) => key.trim())
                .filter((key) => key.includes("|")),
            ),
          ],
        }),
      toggleTheme: () => {
        const current = get().theme;
        const idx = ALL_THEMES.indexOf(current);
        const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length];
        set({ theme: next });
      },
      toggleSidebar: () => {
        const { sidebarCollapsed, sidebarWidthPx } = get();
        if (sidebarCollapsed) {
          // Opening at the old 180px minimum looked cramped: the title and
          // tagline wrapped into a tall block. Open at least at the default
          // width, while preserving a wider custom width.
          set({
            sidebarCollapsed: false,
            sidebarWidthPx: Math.max(sidebarWidthPx, SIDEBAR_WIDTH_DEFAULT),
          });
          return;
        }
        set({ sidebarCollapsed: true });
      },
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSidebarWidthPx: (px) => set({ sidebarWidthPx: clampSidebarWidth(px) }),
      setFontSizePx: (px) => set({ fontSizePx: clampFontSize(px) }),
      setSettingsCollapsed: (id, collapsed) =>
        set((state) => ({
          settingsCollapsed: { ...state.settingsCollapsed, [id]: collapsed },
        })),
      setAllSettingsCollapsed: (ids, collapsed) =>
        set((state) => {
          const next = { ...state.settingsCollapsed };
          for (const id of ids) next[id] = collapsed;
          return { settingsCollapsed: next };
        }),
      setConfirmAllTopTeams: (confirmAllTopTeams) => set({ confirmAllTopTeams }),
      setConfirmLargeMdExport: (confirmLargeMdExport) =>
        set({ confirmLargeMdExport }),
      toggleLiveScreenHidden: (url) =>
        set((state) => ({
          hiddenLiveScreens: state.hiddenLiveScreens.includes(url)
            ? state.hiddenLiveScreens.filter((entry) => entry !== url)
            : [...state.hiddenLiveScreens, url],
        })),
      setCalendarMode: (calendarMode) => set({ calendarMode }),
      setCalendarPlacement: (calendarPlacement) => set({ calendarPlacement }),
      setCalendarCorner: (calendarCorner) => set({ calendarCorner }),
      setCalendarPosition: (calendarPosition) => set({ calendarPosition }),
      setFloatingWidgetsGrouped: (floatingWidgetsGrouped) =>
        set({ floatingWidgetsGrouped }),
      setFloatingWidgetsCorner: (floatingWidgetsCorner) =>
        set({ floatingWidgetsCorner }),
      setQuickTablesMode: (quickTablesMode) => set({ quickTablesMode }),
      setQuickTablesDefaultTab: (quickTablesDefaultTab) =>
        set({ quickTablesDefaultTab }),
      setQuickTablesPlacement: (quickTablesPlacement) =>
        set({ quickTablesPlacement }),
      setQuickTablesCorner: (quickTablesCorner) => set({ quickTablesCorner }),
      setQuickTablesPosition: (quickTablesPosition) =>
        set({ quickTablesPosition }),
      setQuickTablesShortcut: (quickTablesShortcut) =>
        set({ quickTablesShortcut }),
      setMobileNavEnabled: (mobileNavEnabled) => set({ mobileNavEnabled }),
      setMobileNavPlacement: (mobileNavPlacement) =>
        set({ mobileNavPlacement }),
      setMobileNavPosition: (mobileNavPosition) => set({ mobileNavPosition }),
    }),
    {
      name: "vgc-ui",
      version: 21,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Partial<UiState> & {
          theme?: string;
          pokedexQuickTables?: boolean;
          quickTablesFloating?: boolean;
          quickTablesPinnedPage?: string | null;
          quickTablesTitlebarButton?: boolean;
          upcomingCountry?: string | null;
          upcomingCity?: string | null;
          upcomingCountries?: unknown;
          upcomingCities?: unknown;
        };
        let theme: Theme;
        if (version < 1) {
          const legacy = prior.theme;
          theme =
            legacy === "gengar" || legacy === "clefable" ? (legacy as Theme) : "system";
        } else {
          theme = (prior.theme as Theme) ?? "system";
        }
        const migratedHomeCountry =
          version >= 9 &&
          typeof prior.homeCountry === "string" &&
          prior.homeCountry.length === 2
            ? prior.homeCountry.toUpperCase()
            : systemCountry();
        const migratedCountries =
          Array.isArray(prior.upcomingCountries) && version >= 21
            ? [
                ...new Set(
                  prior.upcomingCountries
                    .filter(
                      (code): code is string =>
                        typeof code === "string" && code.length === 2,
                    )
                    .map((code) => code.toUpperCase()),
                ),
              ]
            : typeof prior.upcomingCountry === "string" &&
                prior.upcomingCountry.length === 2
              ? [prior.upcomingCountry.toUpperCase()]
              : migratedHomeCountry
                ? [migratedHomeCountry]
                : [];
        const migratedCities =
          Array.isArray(prior.upcomingCities) && version >= 21
            ? [
                ...new Set(
                  prior.upcomingCities.filter(
                    (key): key is string =>
                      typeof key === "string" && key.includes("|"),
                  ),
                ),
              ]
            : typeof prior.upcomingCity === "string" &&
                prior.upcomingCity.includes("|")
              ? [prior.upcomingCity]
              : [];
        return {
          theme,
          timeZone:
            typeof prior.timeZone === "string" && prior.timeZone.trim()
              ? prior.timeZone
              : "system",
          homeCountry: migratedHomeCountry,
          upcomingCountries: migratedCountries,
          favoriteUpcomingCountry:
            version >= 11 &&
            (prior.favoriteUpcomingCountry === null ||
              (typeof prior.favoriteUpcomingCountry === "string" &&
                prior.favoriteUpcomingCountry.length === 2))
              ? (prior.favoriteUpcomingCountry?.toUpperCase() ?? null)
              : null,
          upcomingCities: migratedCities,
          sidebarCollapsed: prior.sidebarCollapsed ?? false,
          sidebarWidthPx:
            typeof prior.sidebarWidthPx === "number" &&
            prior.sidebarWidthPx > SIDEBAR_WIDTH_MIN
              ? clampSidebarWidth(prior.sidebarWidthPx)
              : SIDEBAR_WIDTH_DEFAULT,
          fontSizePx:
            typeof prior.fontSizePx === "number"
              ? clampFontSize(prior.fontSizePx)
              : FONT_SIZE_DEFAULT,
          settingsCollapsed:
            version >= 17 &&
            prior.settingsCollapsed &&
            typeof prior.settingsCollapsed === "object"
              ? (prior.settingsCollapsed as Record<string, boolean>)
              : {},
          confirmAllTopTeams:
            typeof prior.confirmAllTopTeams === "boolean"
              ? prior.confirmAllTopTeams
              : true,
          confirmLargeMdExport:
            typeof prior.confirmLargeMdExport === "boolean"
              ? prior.confirmLargeMdExport
              : true,
          hiddenLiveScreens:
            version >= 12 && Array.isArray(prior.hiddenLiveScreens)
              ? prior.hiddenLiveScreens.filter(
                  (url): url is string => typeof url === "string",
                )
              : [],
          calendarMode:
            version >= 13 && prior.calendarMode === "floating"
              ? "floating"
              : "titlebar",
          calendarPlacement:
            version >= 13 && prior.calendarPlacement === "free"
              ? "free"
              : "corner",
          calendarCorner:
            version >= 13 && prior.calendarCorner === "bottom-left"
              ? "bottom-left"
              : "bottom-right",
          calendarPosition:
            version >= 13 &&
            prior.calendarPosition &&
            typeof prior.calendarPosition === "object"
              ? (prior.calendarPosition as { x: number; y: number })
              : null,
          floatingWidgetsGrouped:
            typeof prior.floatingWidgetsGrouped === "boolean"
              ? prior.floatingWidgetsGrouped
              : true,
          floatingWidgetsCorner:
            prior.floatingWidgetsCorner === "bottom-left" ||
            prior.quickTablesCorner === "bottom-left"
              ? "bottom-left"
              : "bottom-right",
          quickTablesMode:
            version >= 19 &&
            (prior.quickTablesMode === "titlebar" ||
              prior.quickTablesMode === "floating")
              ? prior.quickTablesMode
              : prior.quickTablesFloating === false ||
                  prior.quickTablesTitlebarButton === true
                ? "titlebar"
                : "floating",
          quickTablesDefaultTab:
            version >= 14 && prior.quickTablesDefaultTab === "natures"
              ? "natures"
              : "types",
          quickTablesPlacement:
            version >= 15 && prior.quickTablesPlacement === "free"
              ? "free"
              : "corner",
          quickTablesCorner:
            version >= 15 && prior.quickTablesCorner === "bottom-left"
              ? "bottom-left"
              : "bottom-right",
          quickTablesPosition:
            version >= 15 &&
            prior.quickTablesPosition &&
            typeof prior.quickTablesPosition === "object"
              ? (prior.quickTablesPosition as { x: number; y: number })
              : null,
          quickTablesShortcut:
            typeof prior.quickTablesShortcut === "string" &&
            prior.quickTablesShortcut.trim().length > 0
              ? prior.quickTablesShortcut
              : "Ctrl+T",
          mobileNavEnabled:
            typeof prior.mobileNavEnabled === "boolean"
              ? prior.mobileNavEnabled
              : true,
          mobileNavPlacement:
            prior.mobileNavPlacement === "free" ? "free" : "fixed",
          mobileNavPosition:
            prior.mobileNavPosition &&
            typeof prior.mobileNavPosition === "object"
              ? (prior.mobileNavPosition as { x: number; y: number })
              : null,
        } as UiState;
      },
    },
  ),
);
