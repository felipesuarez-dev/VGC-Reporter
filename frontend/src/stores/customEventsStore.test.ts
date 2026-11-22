import { beforeEach, describe, expect, it } from "vitest";
import { useCustomEventsStore } from "./customEventsStore";

beforeEach(() => {
  useCustomEventsStore.setState({ events: [] });
});

describe("custom calendar events", () => {
  it("adds an event with a generated id and trims the title", () => {
    useCustomEventsStore.getState().addEvent({
      title: "  Torneo local  ",
      date: "2026-11-24",
      time: "19:00",
      location: "Santiago",
      notes: null,
    });
    const events = useCustomEventsStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Torneo local");
    expect(events[0].id).toBeTruthy();
    expect(events[0].date).toBe("2026-11-24");
  });

  it("removes an event by id", () => {
    useCustomEventsStore.getState().addEvent({
      title: "Evento",
      date: "2026-11-24",
      time: null,
      location: null,
      notes: null,
    });
    const id = useCustomEventsStore.getState().events[0].id;
    useCustomEventsStore.getState().removeEvent(id);
    expect(useCustomEventsStore.getState().events).toEqual([]);
  });
});
