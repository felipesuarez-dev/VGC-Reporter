import { create } from "zustand";
import { emptyTeam, type Team, type TeamMember } from "../lib/types";

interface TeamBuilderState {
  team: Team;
  setTeam: (team: Team) => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  setMember: (slot: number, member: TeamMember) => void;
  reset: () => void;
}

export const useTeamBuilder = create<TeamBuilderState>((set) => ({
  team: emptyTeam(),
  setTeam: (team) => set({ team }),
  setName: (name) => set((s) => ({ team: { ...s.team, name } })),
  setNotes: (notes) => set((s) => ({ team: { ...s.team, notes } })),
  setMember: (slot, member) =>
    set((s) => {
      const members = [...s.team.members];
      members[slot] = member;
      return { team: { ...s.team, members } };
    }),
  reset: () => set({ team: emptyTeam() }),
}));
