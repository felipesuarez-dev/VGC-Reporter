import { beforeEach, describe, expect, it } from "vitest";
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MIN,
  useUiStore,
} from "./uiStore";

beforeEach(() => {
  useUiStore.setState({
    sidebarCollapsed: true,
    sidebarWidthPx: 180,
    upcomingCountry: null,
    favoriteUpcomingCountry: null,
    upcomingCity: null,
    hiddenLiveScreens: [],
  });
});

describe("sidebar width defaults", () => {
  it("opens wide enough for the title and tagline", () => {
    expect(SIDEBAR_WIDTH_DEFAULT).toBeGreaterThanOrEqual(280);
    expect(SIDEBAR_WIDTH_MIN).toBeGreaterThanOrEqual(280);
  });

  it("restores at least the default width when expanding", () => {
    useUiStore.getState().toggleSidebar();
    const state = useUiStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.sidebarWidthPx).toBe(SIDEBAR_WIDTH_DEFAULT);
  });

  it("keeps a wider saved sidebar", () => {
    useUiStore.setState({ sidebarCollapsed: true, sidebarWidthPx: 360 });
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarWidthPx).toBe(360);
  });
});

describe("timezone setting", () => {
  it("defaults to the system zone", () => {
    expect(useUiStore.getState().timeZone).toBe("system");
  });

  it("stores an explicit IANA zone", () => {
    useUiStore.getState().setTimeZone("America/Santiago");
    expect(useUiStore.getState().timeZone).toBe("America/Santiago");
    useUiStore.getState().setTimeZone("system");
  });
});

describe("home country", () => {
  it("stores an ISO country code", () => {
    expect(useUiStore.getState().homeCountry).toMatch(/^[A-Z]{2}$/);
    useUiStore.getState().setHomeCountry("CL");
    expect(useUiStore.getState().homeCountry).toBe("CL");
  });
});

describe("hidden live screens", () => {
  it("toggles a screen without removing it from the configured list", () => {
    const url = "https://www.youtube.com/@yuksvgc";
    useUiStore.getState().toggleLiveScreenHidden(url);
    expect(useUiStore.getState().hiddenLiveScreens).toEqual([url]);
    useUiStore.getState().toggleLiveScreenHidden(url);
    expect(useUiStore.getState().hiddenLiveScreens).toEqual([]);
  });
});

describe("upcoming country filter", () => {
  it("defaults to all countries and stores a pinned code", () => {
    expect(useUiStore.getState().upcomingCountry).toBeNull();
    useUiStore.getState().setUpcomingCountry("cl");
    expect(useUiStore.getState().upcomingCountry).toBe("CL");
    useUiStore.getState().setUpcomingCountry(null);
    expect(useUiStore.getState().upcomingCountry).toBeNull();
  });

  it("stores a favorite country and a city filter", () => {
    useUiStore.getState().setFavoriteUpcomingCountry("cl");
    useUiStore.getState().setUpcomingCity("CL|Santiago");
    expect(useUiStore.getState().favoriteUpcomingCountry).toBe("CL");
    expect(useUiStore.getState().upcomingCity).toBe("CL|Santiago");
    useUiStore.getState().setFavoriteUpcomingCountry(null);
    useUiStore.getState().setUpcomingCity(null);
    expect(useUiStore.getState().favoriteUpcomingCountry).toBeNull();
    expect(useUiStore.getState().upcomingCity).toBeNull();
  });
});
