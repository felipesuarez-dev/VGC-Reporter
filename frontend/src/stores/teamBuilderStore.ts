import { create } from "zustand";
import { emptyTeam, type Team, type TeamMember } from "../lib/types";

interface TeamBuilderState {
  team: Team;
  pendingImport: Team | null;
  pendingImportMissing: string[];
  setTeam: (team: Team) => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  setMember: (slot: number, member: TeamMember) => void;
  setPendingImport: (team: Team) => void;
  setPendingImportMissing: (missing: string[]) => void;
  clearPendingImport: () => void;
  consumePendingImportMissing: () => string[];
  reset: () => void;
}

export const useTeamBuilder = create<TeamBuilderState>((set, get) => ({
  team: emptyTeam(),
  pendingImport: null,
  pendingImportMissing: [],
  setTeam: (team) => set({ team }),
  setName: (name) => set((s) => ({ team: { ...s.team, name } })),
  setNotes: (notes) => set((s) => ({ team: { ...s.team, notes } })),
  setMember: (slot, member) =>
    set((s) => {
      const members = [...s.team.members];
      members[slot] = member;
      return { team: { ...s.team, members } };
    }),
  setPendingImport: (team) => set({ pendingImport: team }),
  setPendingImportMissing: (missing) => set({ pendingImportMissing: missing }),
  clearPendingImport: () => set({ pendingImport: null }),
  consumePendingImportMissing: () => {
    const missing = get().pendingImportMissing;
    set({ pendingImportMissing: [] });
    return missing;
  },
  reset: () => set({ team: emptyTeam() }),
}));
