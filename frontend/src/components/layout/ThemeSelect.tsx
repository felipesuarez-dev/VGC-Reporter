import { useTranslation } from "react-i18next";
import { ChevronDown, Palette } from "lucide-react";
import { ALL_THEMES, useUiStore, type Theme } from "../../stores/uiStore";
import { cn } from "../../lib/cn";
import { SelectionMenu, type SelectionOption } from "./SelectionMenu";

const SWATCH: Record<Theme, { bg: string; accent: string }> = {
  system: { bg: "linear-gradient(135deg, #0b0a14 50%, #fff5f7 50%)", accent: "#8b5cf6" },
  clefable: { bg: "#fff5f7", accent: "#ec4899" },
  milotic: { bg: "#fdeadf", accent: "#1e6fa8" },
  gengar: { bg: "#0b0a14", accent: "#8b5cf6" },
  incineroar: { bg: "#140908", accent: "#f97316" },
  tyranitar: { bg: "#0b120d", accent: "#84cc16" },
  sneasler: { bg: "#c4d4e2", accent: "#d6357a" },
  umbreon: { bg: "#000000", accent: "#f5c542" },
  zekrom: { bg: "#000308", accent: "#00a2ff" },
  reshiram: { bg: "#ffffff", accent: "#c1121f" },
};

interface Props {
  variant?: "default" | "titlebar";
  /** Tighter trigger used by the mobile topbar so controls fit at 360 px. */
  compact?: boolean;
}

export function ThemeSelect({ variant = "default", compact = false }: Props) {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const isTitlebar = variant === "titlebar";
  const label = t(`ui.theme_${theme}`);
  const hint = t(`ui.theme_${theme}_hint`);
  const iconColor =
    theme === "system" ? "var(--text-muted)" : SWATCH[theme].accent;
  const triggerSwatchBg =
    theme === "system"
      ? SWATCH.system.bg
      : `linear-gradient(135deg, ${SWATCH[theme].bg} 50%, ${SWATCH[theme].accent} 50%)`;
  const options: SelectionOption[] = ALL_THEMES.map((entry) => {
    const swatchBg =
      entry === "system"
        ? SWATCH.system.bg
        : `linear-gradient(135deg, ${SWATCH[entry].bg} 50%, ${SWATCH[entry].accent} 50%)`;
    return {
      id: entry,
      label: t(`ui.theme_${entry}`),
      description: t(`ui.theme_${entry}_hint`),
      leading: (
        <span
          aria-hidden
          className="inline-block h-4 w-4 shrink-0 rounded-full border"
          style={{ background: swatchBg, borderColor: "var(--border)" }}
        />
      ),
    };
  });
  return (
    <SelectionMenu
      label={`${label}: ${hint}`}
      trigger={
        <>
          <Palette size={compact ? 16 : 14} style={{ color: iconColor }} />
          {!compact && (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ background: triggerSwatchBg, borderColor: "var(--border)" }}
            />
          )}
          {!compact && (
            <ChevronDown size={11} style={{ color: "var(--text-dim)" }} />
          )}
        </>
      }
      triggerClassName={cn(
        compact
          ? "h-8 w-8 justify-center rounded-lg p-0"
          : isTitlebar
            ? "h-7 px-2 py-0"
            : "p-1.5",
      )}
      options={options}
      selectedId={theme}
      onSelect={(id) => setTheme(id as Theme)}
      openUp={!isTitlebar}
    />
  );
}
