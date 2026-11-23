import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
  leading?: ReactNode;
}

interface Props {
  label: string;
  trigger: ReactNode;
  options: SelectionOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  openUp?: boolean;
  widthClass?: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  emptyLabel?: string;
}

/**
 * Shared popover for theme and language. Both menus must look and behave the
 * same: same width, padding, hover, optional search and a star for the
 * selected option (never a check mark).
 */
export function SelectionMenu({
  label,
  trigger,
  options,
  selectedId,
  onSelect,
  searchable = false,
  searchPlaceholder = "…",
  openUp = false,
  widthClass = "w-64",
  triggerClassName,
  triggerStyle,
  emptyLabel = "—",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={cn("btn-ghost flex items-center gap-1", triggerClassName)}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        style={triggerStyle}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-[60] overflow-hidden rounded-lg border shadow-xl",
            widthClass,
            openUp ? "bottom-full right-0 mb-1" : "right-0 top-full mt-1",
          )}
          style={{
            backgroundColor: "var(--bg-elev)",
            borderColor: "var(--border)",
          }}
          role="listbox"
          aria-label={label}
        >
          {searchable && (
            <input
              className="w-full border-b bg-transparent px-2.5 py-2 text-xs outline-none"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
            />
          )}
          <ul className="max-h-72 overflow-y-auto p-1">
            {visible.map((option) => {
              const selected = option.id === selectedId;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-[var(--bg-elev-strong)]",
                      selected && "font-semibold",
                    )}
                    style={{
                      backgroundColor: selected ? "var(--accent-soft)" : undefined,
                      color: selected ? "var(--accent)" : "var(--text)",
                    }}
                    title={option.description}
                    onClick={() => {
                      onSelect(option.id);
                      setOpen(false);
                    }}
                  >
                    {option.leading}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description && (
                        <span
                          className="mt-0.5 block truncate text-[10px] font-normal"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>
                    {selected && (
                      <Star
                        size={13}
                        fill="currentColor"
                        style={{ color: "var(--accent)", flexShrink: 0 }}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-2.5 py-2 text-center text-[11px]" style={{ color: "var(--text-dim)" }}>
                {emptyLabel}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
