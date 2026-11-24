import { useNavigate } from "react-router-dom";
import { useViewTabsStore } from "../stores/viewTabsStore";

function saveScroll(): void {
  const main = document.getElementById("app-main");
  const state = useViewTabsStore.getState();
  if (main && state.activeId) state.setScroll(state.activeId, main.scrollTop);
}

function restoreScroll(y: number): void {
  const apply = () => {
    const main = document.getElementById("app-main");
    if (main) main.scrollTop = y;
  };
  if (typeof requestAnimationFrame === "undefined") {
    apply();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(apply));
}

/**
 * Shared tab actions for desktop (titlebar tabs) and mobile (views dock). They
 * save the current scroll, navigate to the target tab and restore its scroll.
 */
export function useViewTabActions() {
  const navigate = useNavigate();

  const activate = (id: string) => {
    const state = useViewTabsStore.getState();
    const tab = state.views.find((view) => view.id === id);
    if (!tab) return;
    saveScroll();
    state.activate(id);
    navigate(tab.path);
    restoreScroll(tab.scrollY);
  };

  const create = () => {
    saveScroll();
    useViewTabsStore.getState().createTab("/dashboard", "nav.dashboard");
    navigate("/dashboard");
    restoreScroll(0);
  };

  const close = (id: string) => {
    saveScroll();
    const path = useViewTabsStore.getState().close(id);
    if (!path) return;
    navigate(path, { replace: true });
    const next = useViewTabsStore.getState();
    const tab = next.views.find((view) => view.id === next.activeId);
    restoreScroll(tab?.scrollY ?? 0);
  };

  /** Open a section in the current tab if it exists, otherwise add a tab. */
  const openSection = (path: string, labelKey: string) => {
    const state = useViewTabsStore.getState();
    const existing = state.views.find((view) => view.path === path);
    if (existing) {
      activate(existing.id);
      return;
    }
    saveScroll();
    state.createTab(path, labelKey);
    navigate(path);
    restoreScroll(0);
  };

  return { activate, create, close, openSection };
}
