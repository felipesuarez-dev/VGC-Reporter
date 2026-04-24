import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme =
  | "system"
  | "gengar"
  | "clefable"
  | "incineroar"
  | "tyranitar"
  | "milotic"
  | "sneasler";

export const ALL_THEMES: Theme[] = [
  "system",
  "clefable",
  "gengar",
  "incineroar",
  "tyranitar",
  "milotic",
  "sneasler",
];

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 16;

export const SIDEBAR_WIDTH_MIN = 180;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 240;

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
  sidebarCollapsed: boolean;
  sidebarWidthPx: number;
  fontSizePx: number;
  confirmAllTopTeams: boolean;
  confirmLargeMdExport: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidthPx: (px: number) => void;
  setFontSizePx: (px: number) => void;
  setConfirmAllTopTeams: (v: boolean) => void;
  setConfirmLargeMdExport: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      fontSizePx: FONT_SIZE_DEFAULT,
      confirmAllTopTeams: true,
      confirmLargeMdExport: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const current = get().theme;
        const idx = ALL_THEMES.indexOf(current);
        const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length];
        set({ theme: next });
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSidebarWidthPx: (px) => set({ sidebarWidthPx: clampSidebarWidth(px) }),
      setFontSizePx: (px) => set({ fontSizePx: clampFontSize(px) }),
      setConfirmAllTopTeams: (confirmAllTopTeams) => set({ confirmAllTopTeams }),
      setConfirmLargeMdExport: (confirmLargeMdExport) =>
        set({ confirmLargeMdExport }),
    }),
    {
      name: "vgc-ui",
      version: 5,
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
          sidebarCollapsed: prior.sidebarCollapsed ?? false,
          sidebarWidthPx:
            typeof prior.sidebarWidthPx === "number"
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
        } as UiState;
      },
    },
  ),
);
