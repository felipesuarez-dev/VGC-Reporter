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
    upcomingCountries: [],
    favoriteUpcomingCountry: null,
    upcomingCities: [],
    hiddenLiveScreens: [],
  });
});

describe("sidebar width defaults", () => {  it("opens wide enough for the title and tagline", () => {
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
  it("stores multiple country codes", () => {
    expect(useUiStore.getState().upcomingCountries).toEqual([]);
    useUiStore.getState().setUpcomingCountries(["cl", "ar"]);
    expect(useUiStore.getState().upcomingCountries).toEqual(["CL", "AR"]);
    useUiStore.getState().setUpcomingCountries([]);
    expect(useUiStore.getState().upcomingCountries).toEqual([]);
  });

  it("stores a favorite country and multiple city filters", () => {
    useUiStore.getState().setFavoriteUpcomingCountry("cl");
    useUiStore
      .getState()
      .setUpcomingCities(["CL|Santiago", "AR|Buenos Aires"]);
    expect(useUiStore.getState().favoriteUpcomingCountry).toBe("CL");
    expect(useUiStore.getState().upcomingCities).toEqual([
      "CL|Santiago",
      "AR|Buenos Aires",
    ]);
    useUiStore.getState().setFavoriteUpcomingCountry(null);
    useUiStore.getState().setUpcomingCities([]);
    expect(useUiStore.getState().favoriteUpcomingCountry).toBeNull();
    expect(useUiStore.getState().upcomingCities).toEqual([]);
  });

  it("drops cities outside the selected countries", () => {
    useUiStore
      .getState()
      .setUpcomingCities(["CL|Santiago", "AR|Cordoba"]);
    useUiStore.getState().setUpcomingCountries(["CL"]);
    expect(useUiStore.getState().upcomingCities).toEqual(["CL|Santiago"]);
  });

  it("makes an untouched filter follow the home country", () => {
    useUiStore.setState({
      homeCountry: "CL",
      upcomingCountries: ["CL"],
      upcomingCities: ["CL|Santiago"],
    });
    useUiStore.getState().setHomeCountry("AR");
    expect(useUiStore.getState().upcomingCountries).toEqual(["AR"]);
    expect(useUiStore.getState().upcomingCities).toEqual([]);

    useUiStore.setState({
      homeCountry: "AR",
      upcomingCountries: ["BR"],
      upcomingCities: ["BR|Sao Paulo"],
    });
    useUiStore.getState().setHomeCountry("CL");
    expect(useUiStore.getState().upcomingCountries).toEqual(["BR"]);
    expect(useUiStore.getState().upcomingCities).toEqual(["BR|Sao Paulo"]);
  });
});

describe("widget anchors", () => {
  it("supports titlebar or floating quick tables and calendar", () => {
    useUiStore.getState().setQuickTablesMode("titlebar");
    expect(useUiStore.getState().quickTablesMode).toBe("titlebar");
    useUiStore.getState().setQuickTablesMode("floating");
    expect(useUiStore.getState().quickTablesMode).toBe("floating");
    useUiStore.getState().setCalendarMode("floating");
    expect(useUiStore.getState().calendarMode).toBe("floating");
    useUiStore.getState().setCalendarMode("titlebar");
    expect(useUiStore.getState().calendarMode).toBe("titlebar");
  });
});
