import { useCallback, useEffect, useRef, useState } from "react";
import { useUiStore } from "../stores/uiStore";

/**
 * Country filters start on the local country configured in Settings when the
 * list actually contains data for it. If the local country has no rows (or too
 * few for a ranking view), the filter falls back to “all” so the screen is not
 * empty. An explicit user selection is always preserved.
 */
export function useHomeCountryFilter(
  available: string[] = [],
  minHome = 1,
): {
  selected: string[];
  setSelected: (next: string[]) => void;
  homeCountry: string;
} {
  const homeCountry = useUiStore((state) => state.homeCountry);
  const [selected, setSelected] = useState<string[]>(() =>
    homeCountry ? [homeCountry] : [],
  );
  const touched = useRef(false);
  const availableKey = available.slice().sort().join(",");

  const choose = useCallback((next: string[]) => {
    touched.current = true;
    setSelected(next);
  }, []);

  useEffect(() => {
    if (touched.current) return;
    const count = available.filter((code) => code === homeCountry).length;
    setSelected(count >= minHome && homeCountry ? [homeCountry] : []);
  }, [availableKey, homeCountry, minHome]); // eslint-disable-line react-hooks/exhaustive-deps

  return { selected, setSelected: choose, homeCountry };
}
