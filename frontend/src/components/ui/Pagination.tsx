import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

function pageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap");
    out.push(page);
  }
  return out;
}

/** Compact page controls shared by every paginated section. */
export function Pagination({ page, pageCount, onChange, className }: Props) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(1, page), pageCount);
  return (
    <div className={className ?? "mt-3 flex flex-wrap items-center justify-center gap-1"}>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-30"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label={t("upcoming.previous_page")}
      >
        <ChevronLeft size={13} />
      </button>
      {pageNumbers(current, pageCount).map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            className="px-1 text-[10px]"
            style={{ color: "var(--text-dim)" }}
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className="flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[10px] font-semibold"
            style={{
              borderColor: current === entry ? "var(--accent)" : "var(--border)",
              backgroundColor:
                current === entry ? "var(--accent-soft)" : "transparent",
              color: current === entry ? "var(--accent)" : "var(--text-muted)",
            }}
            onClick={() => onChange(entry)}
            aria-current={current === entry ? "page" : undefined}
          >
            {entry}
          </button>
        ),
      )}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-30"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        onClick={() => onChange(current + 1)}
        disabled={current === pageCount}
        aria-label={t("upcoming.next_page")}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
