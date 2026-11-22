import { ExternalLink, Eye, Newspaper, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { formatDate } from "../../lib/formatDate";
import { openExternal } from "../../lib/openExternal";
import type { RegulationNewsItem } from "../../lib/types";
import { NewsDetailModal } from "./NewsDetailModal";
import { NewsThumbnail } from "./NewsThumbnail";

const NEWS_INDEX = "https://champions-news.pokemon-home.com/en/list";
const PAGE_SIZE = 6;

interface Props {
  className?: string;
  /** Narrow panel inside a shared row: keep a single column. */
  compact?: boolean;
}

export function RegulationNews({ className = "card", compact = false }: Props) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RegulationNewsItem | null>(null);
  const news = useQuery({
    queryKey: queryKeys.regulationNews,
    queryFn: () => ipc.getRegulationNews(),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
  const allItems = news.data ?? [];
  const pages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));

  useEffect(() => {
    if (page >= pages) setPage(pages - 1);
  }, [page, pages]);

  const items = allItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            <Newspaper size={14} />
          </span>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("feed.official_news")}
            </h2>
            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("feed.news_hint")}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 text-xs"
          onClick={() => news.refetch()}
          disabled={news.isFetching}
          aria-label={t("dashboard.refresh")}
          title={t("dashboard.refresh")}
        >
          <RefreshCw
            size={13}
            className={news.isFetching ? "animate-spin" : undefined}
          />
        </button>
      </div>

      {news.isLoading && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      )}
      {news.isError && (
        <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--danger)" }}>
          <span>
            {t("common.error_with_detail", {
              detail: (news.error as Error)?.message ?? "unknown",
            })}
          </span>
          <button
            type="button"
            className="btn-ghost self-start text-xs"
            onClick={() => news.refetch()}
          >
            {t("common.retry")}
          </button>
        </div>
      )}
      {!news.isLoading && !news.isError && items.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("feed.no_news")}
        </p>
      )}
      <ul className={compact ? "grid gap-2" : "grid gap-2 md:grid-cols-2"}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="group flex h-full w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border)" }}
              title={t("feed.preview_news")}
            >
              <NewsThumbnail src={item.banner_url} />
              <span className="min-w-0 flex-1">
                <span
                  className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-[var(--accent)]"
                  style={{ color: "var(--text)" }}
                >
                  {item.title}
                </span>
                <span
                  className="mt-0.5 block text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.category}
                  {item.published_at
                    ? ` · ${formatDate(item.published_at, i18n.language)}`
                    : ""}
                  {item.important && (
                    <span
                      className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--warning) 18%, transparent)",
                        color: "var(--warning)",
                      }}
                    >
                      {t("feed.important")}
                    </span>
                  )}
                </span>
              </span>
              <Eye
                size={12}
                className="mt-0.5 shrink-0"
                style={{ color: "var(--text-dim)" }}
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => openExternal(NEWS_INDEX)}
        >
          {t("feed.all_news")}
          <ExternalLink size={12} className="ml-1" />
        </button>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            type="button"
            className="btn-ghost text-[10px]"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            {t("feed.prev")}
          </button>
          <span style={{ color: "var(--text-dim)" }}>
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            className="btn-ghost text-[10px]"
            disabled={page + 1 >= pages}
            onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
          >
            {t("feed.next")}
          </button>
        </div>
      </div>
      <NewsDetailModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
