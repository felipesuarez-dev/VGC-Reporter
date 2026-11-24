import { create } from "zustand";

export interface ViewTab {
  id: string;
  /** Current route of this tab. */
  path: string;
  labelKey: string;
  scrollY: number;
}

const MAX_TABS = 8;
let tabCounter = 0;

function newTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now().toString(36)}-${tabCounter}`;
}

function dashboardTab(): ViewTab {
  return {
    id: newTabId(),
    path: "/dashboard",
    labelKey: "nav.dashboard",
    scrollY: 0,
  };
}

interface ViewTabsState {
  views: ViewTab[];
  activeId: string | null;
  /** Keep the active tab's route/label in sync with the router. */
  syncActive: (path: string, labelKey: string) => void;
  /** Create a tab and make it active. Used by the + buttons. */
  createTab: (path: string, labelKey: string) => string;
  activate: (id: string) => void;
  /** Returns the path to navigate to when the active tab was closed. */
  close: (id: string) => string | null;
  setScroll: (id: string, scrollY: number) => void;
  reset: () => void;
}

export const useViewTabsStore = create<ViewTabsState>()((set, get) => ({
  views: [],
  activeId: null,
  syncActive: (path, labelKey) => {
    const { views, activeId } = get();
    if (!activeId || views.length === 0) {
      const tab = { ...dashboardTab(), path, labelKey };
      set({ views: [tab], activeId: tab.id });
      return;
    }
    set({
      views: views.map((view) =>
        view.id === activeId ? { ...view, path, labelKey } : view,
      ),
    });
  },
  createTab: (path, labelKey) => {
    const tab: ViewTab = { id: newTabId(), path, labelKey, scrollY: 0 };
    const next = [...get().views, tab];
    // Keep the list bounded; the new tab is active and is never the one dropped.
    set({
      views: next.slice(Math.max(0, next.length - MAX_TABS)),
      activeId: tab.id,
    });
    return tab.id;
  },
  activate: (id) => {
    if (get().views.some((view) => view.id === id)) set({ activeId: id });
  },
  close: (id) => {
    const { views, activeId } = get();
    const index = views.findIndex((view) => view.id === id);
    if (index === -1) return null;
    const wasActive = activeId === id;
    const next = views.filter((view) => view.id !== id);
    if (next.length === 0) {
      const tab = dashboardTab();
      set({ views: [tab], activeId: tab.id });
      return tab.path;
    }
    if (!wasActive) {
      set({ views: next });
      return null;
    }
    const neighbour = next[Math.min(index, next.length - 1)];
    set({ views: next, activeId: neighbour.id });
    return neighbour.path;
  },
  setScroll: (id, scrollY) => {
    set({
      views: get().views.map((view) =>
        view.id === id ? { ...view, scrollY } : view,
      ),
    });
  },
  reset: () => set({ views: [], activeId: null }),
}));
