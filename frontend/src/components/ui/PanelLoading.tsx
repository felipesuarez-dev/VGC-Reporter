import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

export type PanelLoadingVariant =
  | "list"
  | "chart"
  | "cards"
  | "table"
  | "calendar";

interface Props {
  label?: string;
  variant?: PanelLoadingVariant;
  rows?: number;
  hint?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Shared panel-level loading state. Every panel owns its query, so the Feed
 * no longer blocks on the slowest source: this skeleton occupies the panel
 * that is still loading and disappears as soon as its data arrives.
 */
export function PanelLoading({
  label,
  variant = "list",
  rows = 5,
  hint,
  className,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const text = label ?? t("common.loading");
  return (
    <div
      className={cn("space-y-2", compact && "space-y-1.5", className)}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="flex items-center gap-2">
        <Loader2
          size={compact ? 11 : 13}
          className="animate-spin"
          style={{ color: "var(--accent)" }}
          aria-hidden
        />
        <span
          className={cn("font-medium", compact ? "text-[10px]" : "text-[11px]")}
          style={{ color: "var(--text-muted)" }}
        >
          {text}
        </span>
      </div>
      {hint && (
        <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {hint}
        </p>
      )}
      <div className={cn("space-y-2", compact && "space-y-1")}>
        {variant === "cards" && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg"
                style={{ backgroundColor: "var(--bg-elev-strong)", opacity: 0.65 }}
              />
            ))}
          </div>
        )}
        {variant === "chart" && (
          <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-5 animate-pulse rounded"
                style={{
                  width: `${92 - index * 7}%`,
                  backgroundColor: "var(--bg-elev-strong)",
                  opacity: 0.65,
                }}
              />
            ))}
          </div>
        )}
        {variant === "table" && (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <div
              className="h-6 animate-pulse"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            />
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse border-t"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: index % 2 ? "var(--bg-elev)" : "transparent",
                }}
              />
            ))}
          </div>
        )}
        {variant === "calendar" && (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded"
                style={{
                  backgroundColor: "var(--bg-elev-strong)",
                  opacity: index % 7 === 0 || index % 7 === 6 ? 0.35 : 0.65,
                }}
              />
            ))}
          </div>
        )}
        {variant === "list" &&
          Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="h-6 animate-pulse rounded"
              style={{
                width: `${100 - index * 5}%`,
                backgroundColor: "var(--bg-elev-strong)",
                opacity: 0.65,
              }}
            />
          ))}
      </div>
    </div>
  );
}
