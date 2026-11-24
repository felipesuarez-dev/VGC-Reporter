import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoContinuity = "stop" | "mini";

interface PlaybackState {
  /**
   * What happens to a live stream when the user leaves Novedades inside the
   * same tab: stop it, or keep it in a mini player. Tabs themselves always
   * preserve their own playback state.
   */
  continuity: VideoContinuity;
  setContinuity: (continuity: VideoContinuity) => void;
}

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set) => ({
      continuity: "mini",
      setContinuity: (continuity) => set({ continuity }),
    }),
    {
      name: "vgc-playback",
      version: 2,
      // The old builds stored `stop` as an implicit default. Migrate once to
      // the current default; future choices are preserved at version 2.
      migrate: () => ({ continuity: "mini" }),
    },
  ),
);
