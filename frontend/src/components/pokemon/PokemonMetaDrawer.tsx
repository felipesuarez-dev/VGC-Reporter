import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { PokemonUsage, UsageEntry } from "../../lib/types";
import { PokemonSprite } from "./PokemonSprite";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";

interface Props {
  usage: PokemonUsage | null;
  onClose: () => void;
}

export function PokemonMetaDrawer({ usage, onClose }: Props) {
  useEffect(() => {
    if (!usage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [usage, onClose]);

  if (!usage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={usage.species}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <header className="mb-4 flex items-center gap-4">
          <PokemonSprite url={usage.sprite_url} name={usage.species} size={96} />
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {usage.species}
            </h2>
            <p className="text-sm" style={{ color: "var(--accent)" }}>
              {usage.usage_percent.toFixed(1)}%
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DrawerPanel title="drawer.top_items" entries={usage.top_items} kind="item" />
          <DrawerPanel title="drawer.top_moves" entries={usage.top_moves} kind="move" />
          <DrawerPanel title="drawer.top_abilities" entries={usage.top_abilities} kind="ability" />
          <DrawerPanel title="drawer.top_tera" entries={usage.top_tera} />
          <DrawerPanel title="drawer.top_teammates" entries={usage.top_teammates} />
        </div>
      </div>
    </div>
  );
}

function DrawerPanel({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: UsageEntry[];
  kind?: LocalizeKind;
}) {
  const { t } = useTranslation();
  const localize = useLocalize();
  return (
    <section
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
      }}
    >
      <h3
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {t(title)}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 6).map((e) => (
            <li
              key={e.name}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate" style={{ color: "var(--text)" }}>
                {kind ? localize(kind, e.name) : e.name}
              </span>
              <span
                className="shrink-0 tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {e.usage_percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
