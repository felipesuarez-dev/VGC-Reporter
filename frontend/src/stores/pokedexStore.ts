import { create } from "zustand";

export type PokedexSort = "generation" | "alphabetical" | "usage";

interface PokedexState {
  sort: PokedexSort;
  selectedPokemonId: string | null;
  scrollY: number;
  setSort: (sort: PokedexSort) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  setScrollY: (y: number) => void;
}

export const usePokedexStore = create<PokedexState>((set) => ({
  sort: "generation",
  selectedPokemonId: null,
  scrollY: 0,
  setSort: (sort) => set({ sort }),
  openDetail: (selectedPokemonId) => set({ selectedPokemonId }),
  closeDetail: () => set({ selectedPokemonId: null }),
  setScrollY: (scrollY) => set({ scrollY }),
}));
