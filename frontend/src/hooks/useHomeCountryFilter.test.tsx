import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHomeCountryFilter } from "./useHomeCountryFilter";
import { useUiStore } from "../stores/uiStore";

const initialHome = useUiStore.getState().homeCountry;

afterEach(() => {
  useUiStore.setState({ homeCountry: initialHome });
});

describe("useHomeCountryFilter", () => {
  it("falls back to all when the home country has too few rows", async () => {
    useUiStore.setState({ homeCountry: "CL" });
    const { result } = renderHook(() =>
      useHomeCountryFilter(["US", "US", "CL"], 3),
    );
    await waitFor(() => expect(result.current.selected).toEqual([]));
  });

  it("selects the home country with enough rows", async () => {
    useUiStore.setState({ homeCountry: "CL" });
    const { result } = renderHook(() =>
      useHomeCountryFilter(["CL", "CL", "CL", "US"], 3),
    );
    await waitFor(() => expect(result.current.selected).toEqual(["CL"]));
  });
});
