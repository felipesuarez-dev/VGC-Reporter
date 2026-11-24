import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckboxField, SegmentedControl, SelectField, ToggleSwitch } from "./FormControls";

describe("ToggleSwitch", () => {
  it("uses one switch pattern for on/off settings", () => {
    const onChange = vi.fn();
    render(
      <ToggleSwitch
        checked={false}
        onChange={onChange}
        label="Group widgets"
        hint="One rail"
      />,
    );
    const input = screen.getByRole("checkbox");
    expect(input).not.toBeChecked();
    fireEvent.click(screen.getByText("Group widgets"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("SegmentedControl", () => {
  it("uses a single exclusive control instead of native radios", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="fixed"
        onChange={onChange}
        label="Placement"
        options={[
          { value: "fixed", label: "Fixed" },
          { value: "free", label: "Free" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Placement" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Fixed" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Free" }));
    expect(onChange).toHaveBeenCalledWith("free");
  });

  it("can fill the column to match a select", () => {
    render(
      <SegmentedControl
        fullWidth
        value="a"
        onChange={() => undefined}
        label="Default"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup")).toHaveClass("w-full");
  });
});

describe("SelectField", () => {
  it("uses the same 36 px height as the other fields", () => {
    const onChange = vi.fn();
    render(
      <SelectField label="Page" value="a" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </SelectField>,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("h-9");
    expect(select).toHaveValue("a");
    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("CheckboxField", () => {
  it("styles multi-select checkboxes with the same accent", () => {
    const onChange = vi.fn();
    render(
      <CheckboxField checked={false} onChange={onChange} label="Team A" />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
