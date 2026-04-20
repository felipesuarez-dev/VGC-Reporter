import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Palette } from "lucide-react";
import { ALL_THEMES, useUiStore, type Theme } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

const SWATCH: Record<Theme, { bg: string; accent: string }> = {
  system: { bg: "linear-gradient(135deg, #0b0a14 50%, #fff5f7 50%)", accent: "#8b5cf6" },
  clefable: { bg: "#fff5f7", accent: "#ec4899" },
  milotic: { bg: "#fdeadf", accent: "#1e6fa8" },
  gengar: { bg: "#0b0a14", accent: "#8b5cf6" },
  incineroar: { bg: "#140908", accent: "#f97316" },
  tyranitar: { bg: "#0b120d", accent: "#84cc16" },
  sneasler: { bg: "#c4d4e2", accent: "#d6357a" },
};

interface Props {
  variant?: "default" | "titlebar";
}

export function ThemeSelect({ variant = "default" }: Props) {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const label = t(`ui.theme_${theme}`);
  const isTitlebar = variant === "titlebar";
  const iconColor =
    theme === "system" ? "var(--text-muted)" : SWATCH[theme].accent;
  const triggerSwatchBg =
    theme === "system"
      ? SWATCH.system.bg
      : `linear-gradient(135deg, ${SWATCH[theme].bg} 50%, ${SWATCH[theme].accent} 50%)`;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={cn(
          "btn-ghost flex items-center gap-1",
          isTitlebar ? "h-7 px-2 py-0" : "p-1.5",
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
      >
        <Palette size={14} style={{ color: iconColor }} />
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
          style={{
            background: triggerSwatchBg,
            borderColor: "var(--border)",
          }}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-30 flex w-40 flex-col rounded-md border py-1 shadow-lg",
            isTitlebar
              ? "right-0 top-full mt-1"
              : "right-0 bottom-full mb-1",
          )}
          style={{
            backgroundColor: "var(--bg-elev-strong)",
            borderColor: "var(--border)",
          }}
        >
          {ALL_THEMES.map((th) => {
            const active = theme === th;
            const swatchBg =
              th === "system"
                ? SWATCH.system.bg
                : `linear-gradient(135deg, ${SWATCH[th].bg} 50%, ${SWATCH[th].accent} 50%)`;
            return (
              <button
                key={th}
                type="button"
                onClick={() => {
                  setTheme(th);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 text-left text-xs hover:bg-[var(--bg-elev)]",
                  active && "font-semibold",
                )}
                style={{ color: "var(--text)" }}
              >
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border"
                  style={{
                    background: swatchBg,
                    borderColor: "var(--border)",
                  }}
                />
                <span className="flex-1 truncate">{t(`ui.theme_${th}`)}</span>
                {active && (
                  <Check size={12} style={{ color: "var(--accent)" }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
