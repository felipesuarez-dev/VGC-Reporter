import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsageTierList } from "./UsageTierList";
import type { UsageBarItem } from "./UsageBarChart";

/**
 * Runtime tests for the tier view.
 *
 * These exist because of Regla 1: `tsc --noEmit && vite build` proved nothing
 * about render behaviour, and the v0.2.0 treemap shipped a crash that only
 * appeared once real data reached the component. The cases below are the
 * shapes the backend can actually produce — a species the scorer could not
 * rank, a snapshot with no sources, nulls where a source published nothing —
 * so a regression fails in CI instead of after an auto-update.
 */

function item(over: Partial<UsageBarItem> = {}): UsageBarItem {
  return {
    name: "Incineroar",
    usage_percent: 34.7,
    count: 120,
    sprite_url: "https://example.test/incineroar.png",
    sprite_fallback_url: null,
    home_sprite_url: null,
    tier: "S",
    meta_score: 167,
    win_rate: 52.1,
    id: "Incineroar",
    ...over,
  };
}

describe("UsageTierList", () => {
  it("renders nothing for an empty meta instead of an empty shell", () => {
    const { container } = render(<UsageTierList data={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("groups species into their tier rows", () => {
    render(
      <UsageTierList
        data={[
          item({ name: "Kingambit", id: "Kingambit", tier: "S" }),
          item({ name: "Sneasler", id: "Sneasler", tier: "A" }),
          item({ name: "Wigglytuff", id: "Wigglytuff", tier: "D" }),
        ]}
      />,
    );
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("Kingambit")).toBeInTheDocument();
    expect(screen.getByText("Wigglytuff")).toBeInTheDocument();
  });

  it("omits tiers that have no species rather than drawing empty rows", () => {
    render(<UsageTierList data={[item({ tier: "B" })]} />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("S")).not.toBeInTheDocument();
    expect(screen.queryByText("D")).not.toBeInTheDocument();
  });

  /**
   * The backend returns `tier: null` for a species it could not score, which
   * happens on every brand-new regulation. Dropping those silently would make
   * this view disagree with the other three.
   */
  it("keeps species the backend could not rank, in their own row", () => {
    render(
      <UsageTierList
        data={[
          item({ name: "Kingambit", id: "Kingambit", tier: "S" }),
          item({ name: "Mysterymon", id: "Mysterymon", tier: null, meta_score: null }),
        ]}
      />,
    );
    expect(screen.getByText("Mysterymon")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("survives a payload whose optional numbers are all null", () => {
    expect(() =>
      render(
        <UsageTierList
          data={[
            item({
              tier: "C",
              meta_score: null,
              win_rate: null,
              sprite_url: undefined,
              sprite_fallback_url: null,
              home_sprite_url: null,
            }),
          ]}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  /** A tier string the frontend does not know must not break the render. */
  it("treats an unknown tier as unranked", () => {
    render(
      <UsageTierList
        data={[item({ tier: "Z" as unknown as UsageBarItem["tier"] })]}
      />,
    );
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  it("reports the clicked species to its caller", async () => {
    const onItemClick = vi.fn();
    render(<UsageTierList data={[item()]} onItemClick={onItemClick} />);
    await userEvent.click(screen.getByText("Incineroar"));
    expect(onItemClick).toHaveBeenCalledOnce();
    expect(onItemClick.mock.calls[0][0]).toMatchObject({ name: "Incineroar" });
  });

  it("renders read-only entries when no click handler is supplied", () => {
    render(<UsageTierList data={[item()]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /** 100+ species is the normal size of a mature meta. */
  it("handles a full-size meta", () => {
    const tiers: Array<UsageBarItem["tier"]> = ["S", "A", "B", "C", "D"];
    const many = Array.from({ length: 120 }, (_, i) =>
      item({ name: `Mon${i}`, id: `Mon${i}`, tier: tiers[i % 5] }),
    );
    expect(() => render(<UsageTierList data={many} />)).not.toThrow();
    expect(screen.getByText("Mon0")).toBeInTheDocument();
    expect(screen.getByText("Mon119")).toBeInTheDocument();
  });
});
