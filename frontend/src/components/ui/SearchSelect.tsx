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
          !display && "text-slate-500",
          disabled && "cursor-not-allowed opacity-60",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="truncate">{display || resolvedPlaceholder}</span>
        <span className="flex items-center gap-1 text-slate-400">
          {allowClear && value !== null && !disabled && (
            <X
              className="h-4 w-4 hover:text-slate-200"
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
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
        >
          <Command label={resolvedPlaceholder} className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder={resolvedPlaceholder}
              className="w-full border-b border-slate-800 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <Command.List className="max-h-64 overflow-y-auto">
              <Command.Empty className="px-3 py-4 text-center text-sm text-slate-500">
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
                      "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-slate-200",
                      "aria-selected:bg-slate-800",
                    )}
                  >
                    {renderOption ? (
                      renderOption(opt, selected)
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                    {selected && <Check className="h-4 w-4 shrink-0 text-brand-400" />}
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
