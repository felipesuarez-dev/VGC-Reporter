import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TopCutBracket } from "./TopCutBracket";

describe("TopCutBracket", () => {
  it("renders the source bracket and lets the user collapse it", async () => {
    const { container } = render(
      <TopCutBracket
        rounds={[
          {
            label: "Top 8",
            matches: [
              {
                winner: { name: "Masahiro Taoka", seed: 9, country: "JP" },
                loser: { name: "Kandai Nagatome", seed: 1, country: "JP" },
              },
            ],
          },
          {
            label: "Finals",
            matches: [
              {
                winner: { name: "Masahiro Taoka", seed: 9, country: "JP" },
                loser: { name: "Emilio Forbes", seed: 3, country: "US" },
              },
            ],
          },
        ]}
        sourceUrl="https://www.pokedata.ovh/standings2/1000088/Masters"
      />,
    );

    expect(screen.getByText("official.top_cut")).toBeInTheDocument();
    expect(screen.getAllByText("Masahiro Taoka")).toHaveLength(2);
    expect(screen.getByText("Kandai Nagatome")).toBeInTheDocument();
    expect(screen.getByText("Finals")).toBeInTheDocument();
    expect(
      screen.getByText("official.pokedata_note"),
    ).toBeInTheDocument();

    const details = container.querySelector("details");
    expect(details).toHaveAttribute("open");
    await userEvent.click(screen.getByText("official.top_cut"));
    expect(details).not.toHaveAttribute("open");
  });
});
