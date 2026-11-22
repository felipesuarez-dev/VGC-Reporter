import { describe, expect, it } from "vitest";
import { channelSubscribeUrl } from "./youtube";

describe("channelSubscribeUrl", () => {
  it("builds a subscribe confirmation for channel handles", () => {
    expect(
      channelSubscribeUrl("https://www.youtube.com/@yuksvgc/streams"),
    ).toBe("https://www.youtube.com/@yuksvgc?sub_confirmation=1");
    expect(channelSubscribeUrl("https://www.youtube.com/@PlayPokemon")).toBe(
      "https://www.youtube.com/@PlayPokemon?sub_confirmation=1",
    );
  });

  it("supports channel ids and rejects videos/other sites", () => {
    expect(
      channelSubscribeUrl("https://www.youtube.com/channel/UC123/streams"),
    ).toBe("https://www.youtube.com/channel/UC123?sub_confirmation=1");
    expect(
      channelSubscribeUrl("https://www.youtube.com/watch?v=L8C72eKRkEs"),
    ).toBeNull();
    expect(channelSubscribeUrl("https://example.com/@channel")).toBeNull();
  });
});
