import { create } from "zustand";

export interface AvailableUpdate {
  version: string;
  notes: string | null;
}

interface UpdaterState {
  available: AvailableUpdate | null;
  progress: number | null;
  error: string | null;
  dismissed: boolean;
  setAvailable: (v: AvailableUpdate | null) => void;
  setProgress: (p: number | null) => void;
  setError: (e: string | null) => void;
  dismiss: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  available: null,
  progress: null,
  error: null,
  dismissed: false,
  setAvailable: (available) => set({ available }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  dismiss: () => set({ dismissed: true }),
}));
