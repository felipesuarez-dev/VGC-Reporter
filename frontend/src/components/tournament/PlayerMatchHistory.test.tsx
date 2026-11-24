import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerMatchHistory } from "./PlayerMatchHistory";

describe("PlayerMatchHistory", () => {
  it("splits Swiss and Top Cut rounds and marks wins and losses", () => {
    render(
      <PlayerMatchHistory
        swissRounds={12}
        matches={[
          {
            round: 1,
            phase: "swiss",
            opponent_name: "Rohan Muthukumar",
            opponent_country: "US",
            opponent_place: 8,
            result: "win",
          },
          {
            round: 2,
            phase: "swiss",
            opponent_name: "Emilio Forbes",
            opponent_country: "US",
            opponent_place: 2,
            result: "loss",
          },
          {
            round: 13,
            phase: "top-cut",
            opponent_name: "Kandai Nagatome",
            opponent_country: "JP",
            opponent_place: 4,
            result: "win",
          },
        ]}
      />,
    );

    expect(screen.getByText("official.rounds")).toBeInTheDocument();
    expect(screen.getByText("official.swiss")).toBeInTheDocument();
    expect(screen.getByText("official.top_cut_phase")).toBeInTheDocument();
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("R13")).toBeInTheDocument();
    expect(screen.getByText("Rohan Muthukumar")).toBeInTheDocument();
    expect(screen.getByText("Emilio Forbes")).toBeInTheDocument();
    expect(screen.getByText("Kandai Nagatome")).toBeInTheDocument();
    expect(screen.getAllByLabelText("official.result_win")).toHaveLength(2);
    expect(screen.getByLabelText("official.result_loss")).toBeInTheDocument();
  });
});
