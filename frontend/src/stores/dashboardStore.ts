import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format } from "../lib/types";

interface DashboardState {
  format: Format;
  setFormat: (format: Format) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      format: "regulation-i",
      setFormat: (format) => set({ format }),
    }),
    { name: "vgc-dashboard" },
  ),
);
