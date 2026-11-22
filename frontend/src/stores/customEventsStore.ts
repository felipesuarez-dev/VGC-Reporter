import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomCalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  notes: string | null;
}

export type NewCustomCalendarEvent = Omit<CustomCalendarEvent, "id">;

interface CustomEventsState {
  events: CustomCalendarEvent[];
  addEvent: (event: NewCustomCalendarEvent) => void;
  removeEvent: (id: string) => void;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCustomEventsStore = create<CustomEventsState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set((state) => ({
          events: [
            ...state.events,
            { ...event, id: createId(), title: event.title.trim() },
          ],
        })),
      removeEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),
    }),
    {
      name: "vgc-custom-events",
      version: 1,
    },
  ),
);
