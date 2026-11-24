import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewTabsStore } from "../../stores/viewTabsStore";
import { DesktopTabStrip } from "./DesktopTabStrip";

const views = [
  { id: "tab-a", path: "/dashboard", labelKey: "nav.dashboard", scrollY: 0 },
  { id: "tab-b", path: "/pokedex", labelKey: "nav.pokedex", scrollY: 120 },
];

beforeEach(() => {
  useViewTabsStore.setState({ views, activeId: "tab-a" });
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderStrip() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DesktopTabStrip />
    </MemoryRouter>,
  );
}

describe("DesktopTabStrip", () => {
  it("renders one tab per open view and marks the active one", () => {
    renderStrip();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("nav.dashboard")).toBeInTheDocument();
    expect(screen.getByText("nav.pokedex")).toBeInTheDocument();
  });

  it("activates a tab by clicking it", () => {
    renderStrip();
    fireEvent.click(screen.getByText("nav.pokedex"));
    expect(useViewTabsStore.getState().activeId).toBe("tab-b");
  });

  it("closes the active tab and activates the neighbour", () => {
    useViewTabsStore.setState({ activeId: "tab-b" });
    renderStrip();
    const closeButtons = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("tabs.close"));
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[1]);
    const state = useViewTabsStore.getState();
    expect(state.views.map((view) => view.id)).toEqual(["tab-a"]);
    expect(state.activeId).toBe("tab-a");
  });
});
