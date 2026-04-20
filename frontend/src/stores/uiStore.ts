import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme =
  | "system"
  | "gengar"
  | "clefable"
  | "milotic"
  | "incineroar"
  | "tyranitar";

export const ALL_THEMES: Theme[] = [
  "system",
  "clefable",
  "milotic",
  "gengar",
  "incineroar",
  "tyranitar",
];

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const current = get().theme;
        const idx = ALL_THEMES.indexOf(current);
        const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length];
        set({ theme: next });
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "vgc-ui",
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        if (version < 1) {
          const prior = (persisted ?? {}) as Partial<UiState> & { theme?: string };
          const legacy = prior.theme;
          const theme: Theme =
            legacy === "gengar" || legacy === "clefable" ? (legacy as Theme) : "system";
          return {
            theme,
            sidebarCollapsed: prior.sidebarCollapsed ?? false,
          } as UiState;
        }
        return persisted as UiState;
      },
    },
  ),
);
