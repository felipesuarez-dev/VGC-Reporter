import { create } from "zustand";
import type { PokemonType } from "../lib/types";

interface FiltersState {
  query: string;
  typeFilter: PokemonType | null;
  setQuery: (q: string) => void;
  setType: (t: PokemonType | null) => void;
  reset: () => void;
}

export const useFilters = create<FiltersState>((set) => ({
  query: "",
  typeFilter: null,
  setQuery: (query) => set({ query }),
  setType: (typeFilter) => set({ typeFilter }),
  reset: () => set({ query: "", typeFilter: null }),
}));
