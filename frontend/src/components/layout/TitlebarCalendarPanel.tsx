import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, X } from "lucide-react";
import type { RegulationInfo } from "../../lib/types";
import { useModalBack } from "../../hooks/useModalBack";
import { FeedCalendar } from "../dashboard/FeedCalendar";

interface Props {
  open: boolean;
  info: RegulationInfo | null;
  onClose: () => void;
}

/** Calendar anchored to the titlebar, opened from its calendar button. */
export function TitlebarCalendarPanel({ open, info, onClose }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useModalBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        const trigger = (target as HTMLElement).closest?.(
          "[data-titlebar-calendar]",
        );
        if (!trigger) onClose();
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [onClose, open]);

  if (!open || !info) return null;
  return (
    <div
      ref={ref}
      className="fixed right-4 top-[48px] z-[75] max-h-[82vh] w-[min(92vw,440px)] overflow-y-auto rounded-xl border p-3 shadow-2xl"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
      }}
      role="dialog"
      aria-label={t("calendar.widget_title")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          <CalendarDays size={12} />
          {t("calendar.widget_title")}
        </span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text-dim)" }}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={14} />
        </button>
      </div>
      <FeedCalendar info={info} />
    </div>
  );
}
