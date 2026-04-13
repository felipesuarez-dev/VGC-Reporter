import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { ALL_FORMATS, type Format } from "../../lib/types";

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

  const ordered = useMemo(() => {
    return [...ALL_FORMATS].sort((a, b) => {
      if (a.value === favorite) return -1;
      if (b.value === favorite) return 1;
      return 0;
    });
  }, [favorite]);

  const currentLabel = ALL_FORMATS.find((f) => f.value === value)?.label ?? value;

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
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <ul role="listbox" className="py-1">
            {ordered.map((opt) => {
              const selected = opt.value === value;
              const isFav = opt.value === favorite;
              return (
                <li key={opt.value} className="flex items-center">
                  <button
                    type="button"
                    title={t("dashboard.format_favorite")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavoriteChange(opt.value);
                    }}
                    className="flex h-9 w-9 items-center justify-center text-slate-400 hover:text-amber-300"
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
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-between px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-800",
                      selected && "bg-slate-800/60",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && <Check className="h-4 w-4 text-brand-400" />}
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
