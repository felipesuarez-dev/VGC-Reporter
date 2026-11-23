import { useRef, useState } from "react";
import { Table2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/uiStore";
import { useModalBack } from "../../hooks/useModalBack";
import { QuickTables } from "./QuickTables";
import { cn } from "../../lib/cn";

/**
 * Optional floating shortcut to the quick tables. In panel mode the same
 * tables live in the Feed, so this button is intentionally absent.
 */
export function QuickTablesWidget() {
  const { t } = useTranslation();
  const mode = useUiStore((s) => s.quickTablesMode);
  const placement = useUiStore((s) => s.quickTablesPlacement);
  const corner = useUiStore((s) => s.quickTablesCorner);
  const position = useUiStore((s) => s.quickTablesPosition);
  const setPosition = useUiStore((s) => s.setQuickTablesPosition);
  const defaultTab = useUiStore((s) => s.quickTablesDefaultTab);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useModalBack(open, () => setOpen(false));

  if (mode !== "floating") return null;

  const startDrag = (event: React.PointerEvent) => {
    if (placement !== "free" || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDrag({ dx: event.clientX - rect.left, dy: event.clientY - rect.top });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const x = Math.max(8, Math.min(window.innerWidth - 56, event.clientX - drag.dx));
    const y = Math.max(8, Math.min(window.innerHeight - 56, event.clientY - drag.dy));
    setPosition({ x, y });
  };
  const endDrag = () => setDrag(null);

  const style =
    placement === "free" && position
      ? { left: position.x, top: position.y }
      : corner === "bottom-left"
        ? { left: 16, bottom: 76 }
        : { right: 16, bottom: 76 };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "fixed z-[44] flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105",
          placement === "free" && "cursor-move",
        )}
        style={{
          ...style,
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
          color: "var(--accent)",
          touchAction: "none",
        }}
        title={t("type_lab.quick_title")}
        aria-label={t("type_lab.quick_title")}
      >
        <Table2 size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[73] flex items-center justify-center bg-black/65 p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Table2 size={15} style={{ color: "var(--accent)" }} />
                {t("type_lab.quick_title")}
              </h2>
              <button
                type="button"
                className="rounded p-1"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <QuickTables embedded defaultTab={defaultTab} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
