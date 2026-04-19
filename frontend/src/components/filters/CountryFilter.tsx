import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Command } from "cmdk";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/cn";

interface Props {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

function flag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function CountryFilter({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([i18n.language], { type: "region" });
    } catch {
      return null;
    }
  }, [i18n.language]);

  const nameOf = (code: string): string => {
    try {
      return regionNames?.of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unique = useMemo(() => {
    const s = new Set(
      options.filter((c) => c && c.length === 2).map((c) => c.toUpperCase()),
    );
    return [...s].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }, [options, regionNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else onChange([...selected, code]);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex min-h-[2.25rem] w-full items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs">
          {selected.length === 0 ? (
            <span style={{ color: "var(--text-dim)" }}>{placeholder ?? "—"}</span>
          ) : (
            selected.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <span>{flag(c)}</span>
                <span>{c}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(c);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      toggle(c);
                    }
                  }}
                  className="ml-0.5 cursor-pointer rounded-sm p-0.5 hover:bg-[var(--bg-elev-strong)]"
                  aria-label={`Remove ${c}`}
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown size={14} style={{ color: "var(--text-dim)" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border shadow-lg"
          style={{
            backgroundColor: "var(--bg-elev-strong)",
            borderColor: "var(--border)",
          }}
        >
          <Command label={t("common.filter_country_search")} className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder={t("common.filter_country_search")}
              className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-dim)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            />
            <Command.List className="max-h-60 overflow-y-auto">
              <Command.Empty
                className="px-3 py-3 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("common.empty")}
              </Command.Empty>
              {unique.map((c) => {
                const active = selected.includes(c);
                const name = nameOf(c);
                return (
                  <Command.Item
                    key={c}
                    value={`${c} ${name}`}
                    onSelect={() => toggle(c)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs",
                      "aria-selected:bg-[var(--bg-elev)]",
                      active && "font-semibold",
                    )}
                    style={{ color: "var(--text)" }}
                  >
                    <span>{flag(c)}</span>
                    <span className="flex-1 truncate">{name}</span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {c}
                    </span>
                    {active && (
                      <Check size={12} style={{ color: "var(--accent)" }} />
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
