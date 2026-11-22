import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceProvenanceChips, SourceSelector } from "./SourceSelector";
import type { SourceProvenance } from "../../lib/types";

function provenance(over: Partial<SourceProvenance> = {}): SourceProvenance {
  return {
    source: "labmaus",
    declared_regulation: "Regulation Set M-C",
    matches_active_format: true,
    teams: 551,
    tournaments: 19,
    from_date: "2026-09-09",
    to_date: "2026-09-20",
    weight: 0.62,
    ...over,
  };
}

describe("SourceSelector", () => {
  it("defaults to the merged view", () => {
    render(<SourceSelector value={null} onChange={vi.fn()} sources={[provenance()]} />);
    expect(screen.getByRole("button", { name: "sources.label" })).toHaveTextContent(
      "sources.all",
    );
  });

  it("offers every known source plus the merged option", async () => {
    render(<SourceSelector value={null} onChange={vi.fn()} sources={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "sources.label" }));
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("reports the chosen source to its caller", async () => {
    const onChange = vi.fn();
    render(<SourceSelector value={null} onChange={onChange} sources={[provenance()]} />);
    await userEvent.click(screen.getByRole("button", { name: "sources.label" }));
    await userEvent.click(screen.getByRole("option", { name: /sources.name_labmaus/ }));
    expect(onChange).toHaveBeenCalledWith("labmaus");
  });

  it("maps the merged option back to null rather than the string 'all'", async () => {
    const onChange = vi.fn();
    render(
      <SourceSelector value="labmaus" onChange={onChange} sources={[provenance()]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "sources.label" }));
    await userEvent.click(screen.getByRole("option", { name: /sources.all/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("stars a source and selects it", async () => {
    const onChange = vi.fn();
    const onFavoriteChange = vi.fn();
    render(
      <SourceSelector
        value={null}
        onChange={onChange}
        onFavoriteChange={onFavoriteChange}
        sources={[provenance()]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "sources.label" }));
    await userEvent.click(screen.getAllByTitle("sources.favorite_source")[1]);
    expect(onFavoriteChange).toHaveBeenCalledWith("labmaus");
    expect(onChange).toHaveBeenCalledWith("labmaus");
  });

  it("keeps the Smogon slug out of option labels", async () => {
    render(
      <SourceSelector
        value={null}
        onChange={vi.fn()}
        sources={[
          provenance({
            source: "smogon",
            declared_regulation: "gen9championsvgc2026regmc",
            tournaments: 0,
            teams: 277,
          }),
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "sources.label" }));
    expect(screen.queryByText(/gen9championsvgc2026regmc/)).not.toBeInTheDocument();
  });
});

describe("SourceProvenanceChips", () => {
  it("renders nothing when no source contributed", () => {
    const { container } = render(<SourceProvenanceChips sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each source with its share of the result", () => {
    render(
      <SourceProvenanceChips
        sources={[provenance({ weight: 0.62 }), provenance({ source: "smogon", weight: 0.38 })]}
      />,
    );
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
  });

  it("marks a source that is describing another regulation", () => {
    render(
      <SourceProvenanceChips
        sources={[
          provenance({
            source: "champteams",
            declared_regulation: "M-B",
            matches_active_format: false,
          }),
        ]}
      />,
    );
    expect(screen.getByLabelText("sources.other_regulation")).toBeInTheDocument();
  });
});
