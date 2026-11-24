import { describe, expect, it } from "vitest";
import { isEditableTarget, matchesShortcut, normalizeShortcut } from "./shortcut";

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("normalizeShortcut", () => {
  it("normalizes a Ctrl combination in a stable order", () => {
    expect(normalizeShortcut(key({ key: "t", ctrlKey: true, shiftKey: true }))).toBe(
      "Ctrl+Shift+T",
    );
    expect(normalizeShortcut(key({ key: "t", shiftKey: true, ctrlKey: true }))).toBe(
      "Ctrl+Shift+T",
    );
  });

  it("maps Meta to Ctrl so macOS uses the same stored shortcut", () => {
    expect(normalizeShortcut(key({ key: "t", metaKey: true }))).toBe("Ctrl+T");
  });

  it("ignores modifier-only presses", () => {
    expect(normalizeShortcut(key({ key: "Control", ctrlKey: true }))).toBeNull();
    expect(normalizeShortcut(key({ key: "Shift", shiftKey: true }))).toBeNull();
  });

  it("uses a readable name for space", () => {
    expect(normalizeShortcut(key({ key: " ", ctrlKey: true }))).toBe("Ctrl+Space");
  });
});

describe("matchesShortcut", () => {
  it("matches only the configured combination", () => {
    const event = key({ key: "t", ctrlKey: true });
    expect(matchesShortcut(event, "Ctrl+T")).toBe(true);
    expect(matchesShortcut(event, "Ctrl+Shift+T")).toBe(false);
    expect(matchesShortcut(event, "Alt+T")).toBe(false);
  });
});

describe("isEditableTarget", () => {
  it("detects inputs, textareas and contenteditable", () => {
    expect(isEditableTarget(document.createElement("input"))).toBe(true);
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
