import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyVideoFrame } from "./LazyVideoFrame";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  root = null;
  rootMargin = "";
  thresholds = [];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  trigger() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LazyVideoFrame", () => {
  it("waits until the slot is near the viewport before mounting the iframe", async () => {
    render(
      <LazyVideoFrame
        src="https://www.youtube-nocookie.com/embed/abc"
        title="Live"
        className="aspect-video w-full"
      />,
    );
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByText("feed.loading_video")).toBeInTheDocument();

    act(() => MockIntersectionObserver.instances[0].trigger());
    await waitFor(() =>
      expect(document.querySelector("iframe")).toBeInTheDocument(),
    );
    const frame = document.querySelector("iframe")!;
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame.getAttribute("src")).toContain("/embed/abc");
  });

  it("hides the large spinner when the player reports load", async () => {
    render(
      <LazyVideoFrame
        src="https://www.youtube-nocookie.com/embed/abc"
        title="Live"
        className="aspect-video w-full"
      />,
    );
    act(() => MockIntersectionObserver.instances[0].trigger());
    await waitFor(() =>
      expect(document.querySelector("iframe")).toBeInTheDocument(),
    );
    fireEvent.load(document.querySelector("iframe")!);
    await waitFor(() =>
      expect(screen.queryByText("feed.loading_video")).not.toBeInTheDocument(),
    );
  });
});
