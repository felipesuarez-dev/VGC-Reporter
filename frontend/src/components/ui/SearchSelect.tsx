import { Command } from "cmdk";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

export interface SearchSelectProps<T> {
  value: T | null;
  options: T[];
  onChange: (value: T | null) => void;
  getOptionLabel?: (opt: T) => string;
  getOptionKey?: (opt: T) => string;
  renderOption?: (opt: T, selected: boolean) => React.ReactNode;
  placeholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchSelect<T>({
  value,
  options,
  onChange,
  getOptionLabel = (o) => String(o),
  getOptionKey,
  renderOption,
  placeholder,
  emptyText,
  allowClear = true,
  disabled = false,
  className,
}: SearchSelectProps<T>) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("common.search_placeholder");
  const resolvedEmpty = emptyText ?? t("common.empty");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const keyOf = (opt: T) => (getOptionKey ? getOptionKey(opt) : getOptionLabel(opt));

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = value !== null ? getOptionLabel(value) : "";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "input flex items-center justify-between gap-2 text-left",
          disabled && "cursor-not-allowed opacity-60",
        )}
        style={!display ? { color: "var(--text-dim)" } : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="truncate">{display || resolvedPlaceholder}</span>
        <span
          className="flex items-center gap-1"
          style={{ color: "var(--text-muted)" }}
        >
          {allowClear && value !== null && !disabled && (
            <X
              className="h-4 w-4 hover:text-[var(--text)]"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div
          id={listId}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-xl"
          style={{
            backgroundColor: "var(--bg-elev)",
            borderColor: "var(--border)",
          }}
        >
          <Command label={resolvedPlaceholder} className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder={resolvedPlaceholder}
              className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-dim)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
            <Command.List className="max-h-64 overflow-y-auto">
              <Command.Empty
                className="px-3 py-4 text-center text-sm"
                style={{ color: "var(--text-dim)" }}
              >
                {resolvedEmpty}
              </Command.Empty>
              {options.map((opt) => {
                const label = getOptionLabel(opt);
                const k = keyOf(opt);
                const selected = value !== null && keyOf(value) === k;
                return (
                  <Command.Item
                    key={k}
                    value={label}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                      "text-[var(--text)] aria-selected:bg-[var(--bg-elev-strong)]",
                    )}
                  >
                    {renderOption ? (
                      renderOption(opt, selected)
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                    {selected && (
                      <Check
                        className="h-4 w-4 shrink-0"
                        style={{ color: "var(--accent)" }}
                      />
                    )}
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
