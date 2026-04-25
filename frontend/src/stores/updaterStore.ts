import { create } from "zustand";

export interface AvailableUpdate {
  version: string;
  notes: string | null;
  downloadUrl: string | null;
}

interface UpdaterState {
  available: AvailableUpdate | null;
  progress: number | null;
  error: string | null;
  dismissed: boolean;
  errorDismissed: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
  setAvailable: (v: AvailableUpdate | null) => void;
  setProgress: (p: number | null) => void;
  setError: (e: string | null) => void;
  dismiss: () => void;
  dismissError: () => void;
  setChecking: (checking: boolean) => void;
  recordCheck: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  available: null,
  progress: null,
  error: null,
  dismissed: false,
  errorDismissed: false,
  isChecking: false,
  lastCheckedAt: null,
  setAvailable: (available) =>
    set(() => ({ available, dismissed: false })),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set(() => ({ error, errorDismissed: false })),
  dismiss: () => set({ dismissed: true }),
  dismissError: () => set({ errorDismissed: true }),
  setChecking: (isChecking) => set({ isChecking }),
  recordCheck: () => set({ lastCheckedAt: Date.now() }),
}));
