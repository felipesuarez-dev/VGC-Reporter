import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveStreamScreen } from "../../lib/types";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useViewTabsStore, type ViewTab } from "../../stores/viewTabsStore";
import {
  PlaybackHost,
  PlaybackProvider,
  usePlayback,
} from "./PlaybackProvider";

const screenA: LiveStreamScreen = {
  source_url: "https://youtube.com/@a",
  label: "Channel A",
  official: false,
  live: true,
  video_id: "aaa",
  title: "Stream A",
  url: "https://youtube.com/watch?v=aaa",
  embed_url: "https://www.youtube-nocookie.com/embed/aaa",
  thumbnail_url: "https://i.ytimg.com/vi/aaa/hqdefault.jpg",
  recent: null,
};

const screenB: LiveStreamScreen = {
  ...screenA,
  source_url: "https://youtube.com/@b",
  label: "Channel B",
  video_id: "bbb",
  title: "Stream B",
  url: "https://youtube.com/watch?v=bbb",
  embed_url: "https://www.youtube-nocookie.com/embed/bbb",
};

function tab(id: string, path = "/dashboard"): ViewTab {
  return {
    id,
    path,
    labelKey: "nav.dashboard",
    scrollY: 0,
  };
}

function setTabs(activeId: string, ...views: ViewTab[]) {
  useViewTabsStore.setState({ views, activeId });
}

function Harness() {
  const { activate, stop } = usePlayback();
  return (
    <>
      <button type="button" onClick={() => activate(screenA)}>
        play A
      </button>
      <button type="button" onClick={() => activate(screenB)}>
        play B
      </button>
      <button type="button" onClick={() => stop()}>
        stop all
      </button>
      <button type="button" onClick={() => stop(screenA.source_url)}>
        stop A
      </button>
      <PlaybackHost screen={screenA} />
      <PlaybackHost screen={screenB} />
    </>
  );
}

function renderProvider() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>
    </MemoryRouter>,
  );
}

function MiniHarness() {
  const { activate } = usePlayback();
  return (
    <button type="button" onClick={() => activate(screenA)}>
      play mini
    </button>
  );
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  usePlaybackStore.setState({ continuity: "mini" });
  setTabs("tab-a", tab("tab-a"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  usePlaybackStore.setState({ continuity: "mini" });
  useViewTabsStore.setState({ views: [], activeId: null });
});

describe("PlaybackProvider", () => {
  it("creates an autoplaying iframe on play and removes it on stop", () => {
    renderProvider();
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("play A"));
    const frame = document.querySelector("iframe");
    expect(frame).toBeInTheDocument();
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(frame?.getAttribute("src")).toContain("/embed/aaa");
    expect(frame?.getAttribute("src")).toContain("autoplay=1");
    fireEvent.click(screen.getByText("stop all"));
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
  });

  it("reuses the same iframe when the same stream is activated twice", () => {
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    const frame = document.querySelector("iframe");
    if (!frame) throw new Error("iframe not created");
    fireEvent.click(screen.getByText("play A"));
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(document.querySelector("iframe")).toBe(frame);
  });

  it("keeps a separate player for each view tab", () => {
    setTabs("tab-a", tab("tab-a"), tab("tab-b"));
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    expect(document.querySelectorAll("iframe")).toHaveLength(1);

    act(() => useViewTabsStore.setState({ activeId: "tab-b" }));
    fireEvent.click(screen.getByText("play B"));
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    const sources = [...document.querySelectorAll("iframe")].map((frame) =>
      frame.getAttribute("src"),
    );
    expect(sources.some((src) => src?.includes("/embed/aaa"))).toBe(true);
    expect(sources.some((src) => src?.includes("/embed/bbb"))).toBe(true);

    act(() => useViewTabsStore.setState({ activeId: "tab-a" }));
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
  });

  it("stops only the requested stream when a tab has several players", () => {
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    fireEvent.click(screen.getByText("play B"));
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
    fireEvent.click(screen.getByText("stop A"));
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain(
      "/embed/bbb",
    );
  });

  it("removes the players of a closed tab without touching the others", async () => {
    setTabs("tab-a", tab("tab-a"), tab("tab-b"));
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    act(() => useViewTabsStore.setState({ activeId: "tab-b" }));
    fireEvent.click(screen.getByText("play B"));
    expect(document.querySelectorAll("iframe")).toHaveLength(2);

    act(() =>
      useViewTabsStore.setState({ views: [tab("tab-b")], activeId: "tab-b" }),
    );
    await waitFor(() =>
      expect(document.querySelectorAll("iframe")).toHaveLength(1),
    );
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain(
      "/embed/bbb",
    );
  });

  it("shows the mini player when the tile disappears inside the tab", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <PlaybackProvider>
          <MiniHarness />
        </PlaybackProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("play mini"));
    expect(document.querySelector("iframe")).toBeInTheDocument();
    const viewport = document.querySelector('[data-mini="true"]');
    expect(viewport).toBeInTheDocument();
    expect(viewport?.textContent).toContain("Stream A");
    expect(viewport?.getAttribute("style")).toContain("opacity: 1");
  });

  it("keeps a tab's player when leaving the dashboard in mini mode", () => {
    usePlaybackStore.setState({ continuity: "mini" });
    setTabs("tab-a", tab("tab-a"), tab("tab-b"));
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    act(() => useViewTabsStore.setState({ activeId: "tab-b" }));
    fireEvent.click(screen.getByText("play B"));

    act(() =>
      useViewTabsStore.setState({
        views: [tab("tab-a", "/settings"), tab("tab-b")],
        activeId: "tab-b",
      }),
    );
    expect(document.querySelectorAll("iframe")).toHaveLength(2);
  });

  it("stops a tab's player when that tab leaves the dashboard in stop mode", async () => {
    usePlaybackStore.setState({ continuity: "stop" });
    setTabs("tab-a", tab("tab-a"), tab("tab-b"));
    renderProvider();
    fireEvent.click(screen.getByText("play A"));
    act(() => useViewTabsStore.setState({ activeId: "tab-b" }));
    fireEvent.click(screen.getByText("play B"));

    act(() =>
      useViewTabsStore.setState({
        views: [tab("tab-a", "/settings"), tab("tab-b")],
        activeId: "tab-b",
      }),
    );
    await waitFor(() =>
      expect(document.querySelectorAll("iframe")).toHaveLength(1),
    );
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain(
      "/embed/bbb",
    );
  });
});
