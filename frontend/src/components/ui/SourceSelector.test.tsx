import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceProvenanceChips, SourceSelector } from "./SourceSelector";
import type { SourceProvenance } from "../../lib/types";

/**
 * Runtime tests for the source selector and the provenance strip (Regla 1).
 *
 * The provenance strip is the app's honest-labelling surface: if it silently
 * drops the "this source is describing another regulation" marker, the Panel
 * starts presenting last season's numbers as if they were current. That is a
 * correctness bug the type checker cannot see, so it is asserted here.
 */

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
    expect(screen.getByRole("combobox")).toHaveValue("all");
  });

  it("offers every known source even when a snapshot returned none", () => {
    render(<SourceSelector value={null} onChange={vi.fn()} sources={[]} />);
    const options = screen.getAllByRole("option");
    // all + the four providers
    expect(options).toHaveLength(5);
  });

  it("reports the chosen source to its caller", async () => {
    const onChange = vi.fn();
    render(<SourceSelector value={null} onChange={onChange} sources={[provenance()]} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "labmaus");
    expect(onChange).toHaveBeenCalledWith("labmaus");
  });

  it("maps the merged option back to null rather than the string 'all'", async () => {
    const onChange = vi.fn();
    render(<SourceSelector value="labmaus" onChange={onChange} sources={[provenance()]} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "all");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("says so when the view is pinned to one source", () => {
    render(<SourceSelector value="smogon" onChange={vi.fn()} sources={[]} />);
    expect(screen.getByText(/sources\.filtered_hint/)).toBeInTheDocument();
  });

  it("stays quiet about filtering while merged", () => {
    render(<SourceSelector value={null} onChange={vi.fn()} sources={[]} />);
    expect(screen.queryByText(/sources\.filtered_hint/)).not.toBeInTheDocument();
  });

  it("survives provenance with every optional field missing", () => {
    expect(() =>
      render(
        <SourceSelector
          value={null}
          onChange={vi.fn()}
          sources={[
            provenance({
              declared_regulation: null,
              from_date: null,
              to_date: null,
              teams: 0,
              tournaments: 0,
            }),
          ]}
        />,
      ),
    ).not.toThrow();
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

  /**
   * The case the whole provenance mechanism exists for: a source serving a
   * different regulation must be visibly marked, never folded in silently.
   */
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

  it("leaves a current source unmarked", () => {
    render(<SourceProvenanceChips sources={[provenance({ matches_active_format: true })]} />);
    expect(screen.queryByLabelText("sources.other_regulation")).not.toBeInTheDocument();
  });

  it("does not crash when a source declares no regulation", () => {
    expect(() =>
      render(
        <SourceProvenanceChips
          sources={[provenance({ declared_regulation: null, matches_active_format: false })]}
        />,
      ),
    ).not.toThrow();
  });
});
