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
  | "zekrom";

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
  /** Upcoming tournament filter; `null` means every country. */
  upcomingCountry: string | null;
  /** Starred country shown first in the upcoming country picker. */
  favoriteUpcomingCountry: string | null;
  /** City filter key (`country|city`); `null` means every city. */
  upcomingCity: string | null;
  sidebarCollapsed: boolean;
  sidebarWidthPx: number;
  fontSizePx: number;
  confirmAllTopTeams: boolean;
  confirmLargeMdExport: boolean;
  /** Live screens hidden from the player but kept in the configured list. */
  hiddenLiveScreens: string[];
  calendarMode: "panel" | "floating";
  calendarPlacement: "corner" | "free";
  calendarCorner: "bottom-right" | "bottom-left";
  calendarPosition: { x: number; y: number } | null;
  setTheme: (theme: Theme) => void;
  setTimeZone: (timeZone: string) => void;
  setHomeCountry: (country: string) => void;
  setUpcomingCountry: (country: string | null) => void;
  setFavoriteUpcomingCountry: (country: string | null) => void;
  setUpcomingCity: (city: string | null) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidthPx: (px: number) => void;
  setFontSizePx: (px: number) => void;
  setConfirmAllTopTeams: (v: boolean) => void;
  setConfirmLargeMdExport: (v: boolean) => void;
  toggleLiveScreenHidden: (url: string) => void;
  setCalendarMode: (mode: "panel" | "floating") => void;
  setCalendarPlacement: (placement: "corner" | "free") => void;
  setCalendarCorner: (corner: "bottom-right" | "bottom-left") => void;
  setCalendarPosition: (position: { x: number; y: number } | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      timeZone: "system",
      homeCountry: systemCountry(),
      upcomingCountry: null,
      favoriteUpcomingCountry: null,
      upcomingCity: null,
      sidebarCollapsed: false,
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      fontSizePx: FONT_SIZE_DEFAULT,
      confirmAllTopTeams: true,
      confirmLargeMdExport: true,
      hiddenLiveScreens: [],
      calendarMode: "panel",
      calendarPlacement: "corner",
      calendarCorner: "bottom-right",
      calendarPosition: null,
      setTheme: (theme) => set({ theme }),
      setTimeZone: (timeZone) => set({ timeZone }),
      setHomeCountry: (homeCountry) => set({ homeCountry }),
      setUpcomingCountry: (upcomingCountry) =>
        set({
          upcomingCountry:
            upcomingCountry && upcomingCountry.length === 2
              ? upcomingCountry.toUpperCase()
              : null,
        }),
      setFavoriteUpcomingCountry: (favoriteUpcomingCountry) =>
        set({
          favoriteUpcomingCountry:
            favoriteUpcomingCountry && favoriteUpcomingCountry.length === 2
              ? favoriteUpcomingCountry.toUpperCase()
              : null,
        }),
      setUpcomingCity: (upcomingCity) =>
        set({ upcomingCity: upcomingCity?.trim() || null }),
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
    }),
    {
      name: "vgc-ui",
      version: 13,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Partial<UiState> & { theme?: string };
        let theme: Theme;
        if (version < 1) {
          const legacy = prior.theme;
          theme =
            legacy === "gengar" || legacy === "clefable" ? (legacy as Theme) : "system";
        } else {
          theme = (prior.theme as Theme) ?? "system";
        }
        return {
          theme,
          timeZone:
            typeof prior.timeZone === "string" && prior.timeZone.trim()
              ? prior.timeZone
              : "system",
          homeCountry:
            version >= 9 &&
            typeof prior.homeCountry === "string" &&
            prior.homeCountry.length === 2
              ? prior.homeCountry.toUpperCase()
              : systemCountry(),
          upcomingCountry:
            version >= 10 &&
            (prior.upcomingCountry === null ||
              (typeof prior.upcomingCountry === "string" &&
                prior.upcomingCountry.length === 2))
              ? (prior.upcomingCountry?.toUpperCase() ?? null)
              : null,
          favoriteUpcomingCountry:
            version >= 11 &&
            (prior.favoriteUpcomingCountry === null ||
              (typeof prior.favoriteUpcomingCountry === "string" &&
                prior.favoriteUpcomingCountry.length === 2))
              ? (prior.favoriteUpcomingCountry?.toUpperCase() ?? null)
              : null,
          upcomingCity:
            version >= 11 &&
            (prior.upcomingCity === null || typeof prior.upcomingCity === "string")
              ? (prior.upcomingCity ?? null)
              : null,
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
              : "panel",
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
        } as UiState;
      },
    },
  ),
);
