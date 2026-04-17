import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { ALL_FORMATS, type Format, type FormatOption } from "../../lib/types";

interface Props {
  value: Format;
  favorite: Format;
  onChange: (f: Format) => void;
  onFavoriteChange: (f: Format) => void;
  className?: string;
}

export function FormatSelector({
  value,
  favorite,
  onChange,
  onFavoriteChange,
  className,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  const ordered = useMemo<FormatOption[]>(() => {
    return [...ALL_FORMATS].sort((a, b) => {
      const aKey = a.disabled ? 2 : a.value === favorite ? 0 : 1;
      const bKey = b.disabled ? 2 : b.value === favorite ? 0 : 1;
      return aKey - bKey;
    });
  }, [favorite]);

  const currentLabel =
    ALL_FORMATS.find((f) => f.value === value && !f.disabled)?.label ?? value;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        className="input flex h-9 items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className="h-4 w-4"
          style={{ color: "var(--text-muted)" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border shadow-xl"
          style={{
            backgroundColor: "var(--bg-elev)",
            borderColor: "var(--border)",
          }}
        >
          <ul role="listbox" className="py-1">
            {ordered.map((opt, idx) => {
              const selected = !opt.disabled && opt.value === value;
              const isFav = !opt.disabled && opt.value === favorite;
              return (
                <li
                  key={`${opt.value}-${idx}`}
                  className="flex items-center"
                >
                  <button
                    type="button"
                    title={t("dashboard.format_favorite")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (opt.disabled) return;
                      onFavoriteChange(opt.value);
                    }}
                    disabled={opt.disabled}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center",
                      opt.disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:text-amber-300",
                    )}
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        isFav && "fill-amber-300 text-amber-300",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-disabled={opt.disabled ? "true" : undefined}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-between gap-2 px-2 py-2 text-left text-sm",
                      opt.disabled
                        ? "cursor-not-allowed text-[var(--text-dim)]"
                        : "text-[var(--text)] hover:bg-[var(--bg-elev-strong)]",
                      selected && "bg-[var(--accent-soft)]",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {opt.badgeKey && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t(opt.badgeKey)}
                        </span>
                      )}
                      {selected && (
                        <Check
                          className="h-4 w-4"
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
