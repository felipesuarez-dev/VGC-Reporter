import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme =
  | "system"
  | "gengar"
  | "clefable"
  | "incineroar"
  | "tyranitar"
  | "milotic";

export const ALL_THEMES: Theme[] = [
  "system",
  "clefable",
  "gengar",
  "incineroar",
  "tyranitar",
  "milotic",
];

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 16;

function clampFontSize(px: number): number {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(px)));
}

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  fontSizePx: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setFontSizePx: (px: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      fontSizePx: FONT_SIZE_DEFAULT,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const current = get().theme;
        const idx = ALL_THEMES.indexOf(current);
        const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length];
        set({ theme: next });
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setFontSizePx: (px) => set({ fontSizePx: clampFontSize(px) }),
    }),
    {
      name: "vgc-ui",
      version: 2,
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
          fontSizePx:
            typeof prior.fontSizePx === "number"
              ? clampFontSize(prior.fontSizePx)
              : FONT_SIZE_DEFAULT,
        } as UiState;
      },
    },
  ),
);
