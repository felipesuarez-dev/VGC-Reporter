import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelOrder, PanelOrderGroup } from "./PanelBoard";

beforeAll(() => {
  // jsdom does not implement pointer capture or hit testing.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  document.elementFromPoint = vi.fn();
});

function Harness() {
  const [order, setOrder] = useState(["a", "b", "c"]);
  return (
    <>
      <output data-testid="order">{order.join(",")}</output>
      <PanelOrderGroup order={order} onOrderChange={setOrder}>
        <PanelOrder id="a" label="Panel A">
          <div>Content A</div>
        </PanelOrder>
        <PanelOrder id="b" label="Panel B">
          <div>Content B</div>
        </PanelOrder>
        <PanelOrder id="c" label="Panel C">
          <div>Content C</div>
        </PanelOrder>
      </PanelOrderGroup>
    </>
  );
}

describe("PanelOrderGroup", () => {
  it("renders a drag handle and move controls for every panel", () => {
    render(<Harness />);
    expect(screen.getAllByLabelText("ui.drag_panel")).toHaveLength(3);
    expect(screen.getAllByLabelText("ui.move_panel_down")).toHaveLength(3);
    expect(screen.getByText("Panel A")).toBeInTheDocument();
  });

  it("reorders with the keyboard/accessibility buttons", async () => {
    render(<Harness />);
    expect(screen.getByTestId("order")).toHaveTextContent("a,b,c");
    await userEvent.click(screen.getAllByLabelText("ui.move_panel_down")[0]);
    expect(screen.getByTestId("order")).toHaveTextContent("b,a,c");
    await userEvent.click(screen.getAllByLabelText("ui.move_panel_up")[2]);
    expect(screen.getByTestId("order")).toHaveTextContent("b,c,a");
  });

  it("reorders by dragging a handle over another panel", () => {
    render(<Harness />);
    const handleA = screen.getAllByLabelText("ui.drag_panel")[0];
    const panelC = document.querySelector(
      '[data-panel-board-id="c"]',
    ) as HTMLElement;
    panelC.getBoundingClientRect = () =>
      ({ top: 100, height: 100, bottom: 200, left: 0, right: 100, width: 100, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
    vi.spyOn(document, "elementFromPoint").mockReturnValue(panelC);

    fireEvent.pointerDown(handleA, { button: 0, pointerId: 1, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 180 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 180 });
    expect(screen.getByTestId("order")).toHaveTextContent("b,c,a");
    vi.restoreAllMocks();
  });
});
