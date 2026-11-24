import { beforeEach, describe, expect, it } from "vitest";
import { useViewTabsStore } from "./viewTabsStore";

beforeEach(() => {
  useViewTabsStore.getState().reset();
});

describe("view tabs", () => {
  it("creates the first tab from the current route", () => {
    useViewTabsStore.getState().syncActive("/pokedex", "nav.pokedex");
    const state = useViewTabsStore.getState();
    expect(state.views).toHaveLength(1);
    expect(state.views[0].path).toBe("/pokedex");
    expect(state.activeId).toBe(state.views[0].id);
  });

  it("updates the active tab when navigating inside it", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    const id = useViewTabsStore.getState().activeId;
    store.syncActive("/settings", "nav.settings");
    const state = useViewTabsStore.getState();
    expect(state.views).toHaveLength(1);
    expect(state.views[0].id).toBe(id);
    expect(state.views[0].path).toBe("/settings");
    expect(state.views[0].labelKey).toBe("nav.settings");
  });

  it("allows duplicate dashboard tabs and activates the new one", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    const firstId = useViewTabsStore.getState().activeId;
    const secondId = store.createTab("/dashboard", "nav.dashboard");
    const state = useViewTabsStore.getState();
    expect(state.views.map((view) => view.path)).toEqual([
      "/dashboard",
      "/dashboard",
    ]);
    expect(state.activeId).toBe(secondId);
    expect(secondId).not.toBe(firstId);
  });

  it("activates a tab by id", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    const first = useViewTabsStore.getState().activeId!;
    const second = store.createTab("/pokedex", "nav.pokedex");
    store.activate(first);
    expect(useViewTabsStore.getState().activeId).toBe(first);
    store.activate(second);
    expect(useViewTabsStore.getState().activeId).toBe(second);
  });

  it("closes the active tab and returns the neighbour path", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    store.createTab("/pokedex", "nav.pokedex");
    const third = store.createTab("/settings", "nav.settings");
    expect(store.close(third)).toBe("/pokedex");
    const state = useViewTabsStore.getState();
    expect(state.views.map((view) => view.path)).toEqual([
      "/dashboard",
      "/pokedex",
    ]);
    expect(state.activeId).toBe(state.views[1].id);
  });

  it("closing a non-active tab does not navigate", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    const dashboardId = useViewTabsStore.getState().activeId!;
    store.createTab("/pokedex", "nav.pokedex");
    expect(store.close(dashboardId)).toBeNull();
    expect(useViewTabsStore.getState().views).toHaveLength(1);
    expect(useViewTabsStore.getState().activeId).not.toBe(dashboardId);
  });

  it("closing the last tab creates a dashboard tab", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/pokedex", "nav.pokedex");
    const id = useViewTabsStore.getState().activeId!;
    expect(store.close(id)).toBe("/dashboard");
    const state = useViewTabsStore.getState();
    expect(state.views).toHaveLength(1);
    expect(state.views[0].path).toBe("/dashboard");
    expect(state.activeId).toBe(state.views[0].id);
  });

  it("caps the list and keeps the newest tab active", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    for (let index = 0; index < 10; index += 1) {
      store.createTab(`/page-${index}`, `label-${index}`);
    }
    const state = useViewTabsStore.getState();
    expect(state.views).toHaveLength(8);
    expect(state.views[state.views.length - 1].path).toBe("/page-9");
    expect(state.activeId).toBe(state.views[state.views.length - 1].id);
  });

  it("stores scroll independently per tab", () => {
    const store = useViewTabsStore.getState();
    store.syncActive("/dashboard", "nav.dashboard");
    const id = useViewTabsStore.getState().activeId!;
    store.setScroll(id, 420);
    expect(useViewTabsStore.getState().views[0].scrollY).toBe(420);
  });
});
