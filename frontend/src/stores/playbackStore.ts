import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoContinuity = "stop" | "mini";

interface PlaybackState {
  /** What happens when the user leaves Novedades with a kept stream. */
  continuity: VideoContinuity;
  setContinuity: (continuity: VideoContinuity) => void;
}

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set) => ({
      continuity: "stop",
      setContinuity: (continuity) => set({ continuity }),
    }),
    { name: "vgc-playback" },
  ),
);
