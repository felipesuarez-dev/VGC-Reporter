import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LIVE_FALLBACK_IMAGE, LiveFallbackImage } from "./LiveFallbackImage";

describe("LiveFallbackImage", () => {
  it("uses the bundled test card when no source is provided", () => {
    render(<LiveFallbackImage src={null} alt="Fallback" />);
    expect(screen.getByAltText("Fallback")).toHaveAttribute(
      "src",
      LIVE_FALLBACK_IMAGE,
    );
  });

  it("switches to the test card when the remote thumbnail fails", () => {
    render(
      <LiveFallbackImage
        src="https://example.com/broken.jpg"
        alt="Broken"
      />,
    );
    const image = screen.getByAltText("Broken");
    expect(image.getAttribute("src")).toContain("broken.jpg");
    fireEvent.error(image);
    expect(image).toHaveAttribute("src", LIVE_FALLBACK_IMAGE);
  });
});
