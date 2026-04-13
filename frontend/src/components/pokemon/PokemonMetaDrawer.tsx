import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { PokemonUsage, UsageEntry } from "../../lib/types";
import { PokemonSprite } from "./PokemonSprite";

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
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <header className="mb-4 flex items-center gap-4">
          <PokemonSprite url={usage.sprite_url} name={usage.species} size={96} />
          <div>
            <h2 className="text-xl font-bold text-slate-100">{usage.species}</h2>
            <p className="text-sm text-brand-300">
              {usage.usage_percent.toFixed(1)}%
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DrawerPanel title="drawer.top_items" entries={usage.top_items} />
          <DrawerPanel title="drawer.top_moves" entries={usage.top_moves} />
          <DrawerPanel title="drawer.top_abilities" entries={usage.top_abilities} />
          <DrawerPanel title="drawer.top_tera" entries={usage.top_tera} />
          <DrawerPanel title="drawer.top_teammates" entries={usage.top_teammates} />
        </div>
      </div>
    </div>
  );
}

function DrawerPanel({ title, entries }: { title: string; entries: UsageEntry[] }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t(title)}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-600">—</p>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 6).map((e) => (
            <li
              key={e.name}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate text-slate-200">{e.name}</span>
              <span className="shrink-0 tabular-nums text-brand-300">
                {e.usage_percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
