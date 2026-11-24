import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Canonical on/off control for the whole app. Native checkbox semantics stay
 * intact for accessibility; only the chrome is custom.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 py-0.5",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium" style={{ color: "var(--text)" }}>
          {label}
        </span>
        {hint && (
          <span
            className="mt-0.5 block text-[11px] leading-snug"
            style={{ color: "var(--text-muted)" }}
          >
            {hint}
          </span>
        )}
      </span>
      <span className="relative mt-0.5 flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-elev)]"
          style={{
            backgroundColor: checked
              ? "var(--accent)"
              : "var(--bg-elev-strong)",
            borderColor: checked ? "var(--accent)" : "var(--border)",
          }}
        />
        <span
          aria-hidden
          className="absolute h-5 w-5 rounded-full shadow-sm transition-all duration-200"
          style={{
            left: checked ? "1.375rem" : "0.125rem",
            backgroundColor: checked
              ? "var(--accent-contrast, #111)"
              : "var(--text-muted)",
          }}
        />
      </span>
    </label>
  );
}

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
}

/**
 * Canonical checkbox for multi-select lists and explicit acknowledgements.
 * Switches are for instant preferences; checkboxes are for selecting items.
 */
export function CheckboxField({
  checked,
  onChange,
  label,
  className,
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 text-[11px]",
        className,
      )}
    >
      <span
        className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
        style={{
          borderColor: checked ? "var(--accent)" : "var(--border)",
          backgroundColor: checked ? "var(--accent)" : "transparent",
        }}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {checked && (
          <Check
            size={11}
            strokeWidth={3}
            style={{ color: "var(--accent-contrast, #111)" }}
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 rounded peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]"
        />
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label?: string;
  hint?: string;
  className?: string;
  /** Fill the available column so it matches a select/combobox beside it. */
  fullWidth?: boolean;
}

/**
 * Canonical exclusive choice. Replaces native radio groups so every part of the
 * app reads as one designed control instead of mixed browser widgets.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  hint,
  className,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={className}>
      {label && (
        <div
          className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "inline-flex h-9 max-w-full flex-wrap items-stretch gap-0.5 rounded-lg border p-0.5",
          fullWidth && "flex w-full",
        )}
        style={{
          borderColor: "var(--border)",
          backgroundColor: "color-mix(in srgb, var(--bg) 70%, transparent)",
        }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-center rounded-md px-3 text-[11px] font-semibold transition-colors",
                fullWidth && "flex-1",
              )}
              style={{
                backgroundColor: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                boxShadow: active
                  ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent)"
                  : undefined,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/** Select + label with the same height and typography as the segmented control. */
export function SelectField({
  label,
  value,
  onChange,
  children,
  className,
}: SelectFieldProps) {
  return (
    <label className={cn("block", className)}>
      <span
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
      <select
        className="input h-9 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
