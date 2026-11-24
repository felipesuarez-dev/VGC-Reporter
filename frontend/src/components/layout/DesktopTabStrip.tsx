import { useEffect, useRef } from "react";
import { LayoutDashboard, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sectionForPath } from "../../lib/navSections";
import { useViewTabActions } from "../../hooks/useViewTabActions";
import { useViewTabsStore } from "../../stores/viewTabsStore";
import { cn } from "../../lib/cn";

/**
 * Desktop tab strip that lives inside the titlebar/navbar. The + button is
 * rendered by the titlebar next to the search icon.
 */
export function DesktopTabStrip() {
  const { t } = useTranslation();
  const views = useViewTabsStore((s) => s.views);
  const activeId = useViewTabsStore((s) => s.activeId);
  const { activate, close } = useViewTabActions();
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId, views.length]);

  if (views.length === 0) return null;

  return (
    <div
      className="tab-strip flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1"
      role="tablist"
      aria-label={t("tabs.title")}
    >
      {views.map((view) => {
        const section = sectionForPath(view.path);
        const Icon = section?.icon ?? LayoutDashboard;
        const active = view.id === activeId;
        return (
          <div
            key={view.id}
            ref={active ? activeRef : undefined}
            role="tab"
            aria-selected={active}
            className={cn(
              "group flex h-[30px] max-w-[180px] shrink-0 items-center rounded-lg border transition-colors",
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-transparent hover:bg-[var(--bg-elev-strong)]",
            )}
          >
            <button
              type="button"
              onClick={() => activate(view.id)}
              className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-[10.5px] font-semibold"
              style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              title={t(view.labelKey)}
            >
              <Icon
                size={13}
                className="shrink-0"
                style={{ color: active ? "var(--accent)" : "var(--text-dim)" }}
              />
              <span className="truncate">{t(view.labelKey)}</span>
            </button>
            <button
              type="button"
              onClick={() => close(view.id)}
              className={cn(
                "mr-1 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-opacity",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              style={{ color: "var(--text-dim)" }}
              aria-label={t("tabs.close", { name: t(view.labelKey) })}
              title={t("tabs.close")}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
