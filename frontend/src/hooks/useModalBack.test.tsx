import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useModalBack } from "./useModalBack";

function Modal({
  open,
  label,
  onClose,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
}) {
  useModalBack(open, onClose);
  if (!open) return null;
  return <div>{label}</div>;
}

describe("useModalBack", () => {
  afterEach(() => {
    window.history.replaceState(null, "");
  });

  it("closes only the topmost modal on Escape", () => {
    const parent = vi.fn();
    const child = vi.fn();
    render(
      <>
        <Modal open label="parent" onClose={parent} />
        <Modal open label="child" onClose={child} />
      </>,
    );
    expect(screen.getByText("parent")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(child).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveBeenCalled();
  });

  it("keeps the parent open when the child unmounts", () => {
    const parent = vi.fn();
    const child = vi.fn();
    const view = render(
      <Modal open label="parent" onClose={parent} />,
    );
    view.rerender(
      <>
        <Modal open label="parent" onClose={parent} />
        <Modal open label="child" onClose={child} />
      </>,
    );
    view.rerender(<Modal open label="parent" onClose={parent} />);
    expect(parent).not.toHaveBeenCalled();
    expect(child).not.toHaveBeenCalled();
  });
});
