import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModalBack } from "../../hooks/useModalBack";
import { formatDate } from "../../lib/formatDate";
import { openExternal } from "../../lib/openExternal";
import type { RegulationNewsItem } from "../../lib/types";

interface Props {
  item: RegulationNewsItem | null;
  onClose: () => void;
}

/**
 * In-app preview of an official Champions news page. The page is rendered in
 * an iframe (the official site does not send X-Frame-Options), so the user can
 * read it without leaving the app; "Open in browser" is always available as a
 * fallback if the preview cannot load.
 */
export function NewsDetailModal({ item, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  useModalBack(Boolean(item), onClose);

  useEffect(() => {
    if (!item) return;
    setLoaded(false);
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <div
              className="text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {item.category}
              {item.published_at
                ? ` · ${formatDate(item.published_at, i18n.language)}`
                : ""}
            </div>
            <h2
              className="mt-0.5 line-clamp-2 text-sm font-semibold sm:text-base"
              style={{ color: "var(--text)" }}
            >
              {item.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => openExternal(item.url)}
              title={t("feed.open_in_browser")}
            >
              <ExternalLink size={13} className="mr-1" />
              {t("feed.open_in_browser")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          className="relative min-h-0 flex-1"
          style={{ backgroundColor: "var(--bg)" }}
        >
          {!loaded && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ color: "var(--text-dim)" }}
            >
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          <iframe
            src={item.url}
            title={item.title}
            className="h-full w-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}
