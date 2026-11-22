import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useItemDetailStore } from "../../stores/entityDetailStore";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { useLocalize } from "../../hooks/useTranslations";
import { useDescribe } from "../../hooks/useEntityDescriptions";
import { useModalBack } from "../../hooks/useModalBack";
import { ItemSprite } from "../items/ItemSprite";
import { prettifyItemName } from "../../lib/labels";

export function ItemDetailModal() {
  const { t } = useTranslation();
  const name = useItemDetailStore((s) => s.name);
  const users = useItemDetailStore((s) => s.users);
  const close = useItemDetailStore((s) => s.close);
  const localize = useLocalize();
  const describe = useDescribe();

  useModalBack(Boolean(name), close);

  useEffect(() => {
    if (!name) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [name, close]);

  if (!name) return null;

  const localized = localize("item", name);
  const label = localized === name ? prettifyItemName(name) : localized || name;
  const description = describe("item", name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={close}
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-8">
          <ItemSprite name={name} size={64} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {label}
            </h2>
            <div
              className="mt-0.5 text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {t("entity.item")}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {t("item_detail.effect")}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
            {description ?? t("item_detail.no_description")}
          </p>
        </div>

        {users.length > 0 && (
          <div className="mt-5">
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {t("item_detail.top_users")}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {users.map((user) => (
                <li
                  key={user.species}
                  className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--bg-elev-strong)",
                  }}
                  title={t("dashboard.entity_user_hint", {
                    name: user.species,
                    percent: user.usagePercent.toFixed(1),
                  })}
                >
                  <PokemonSprite
                    url={user.spriteUrl}
                    fallbackUrl={user.fallbackUrl}
                    homeUrl={user.homeUrl}
                    name={user.species}
                    size={30}
                    variant="pixel"
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {user.species}
                  </span>
                  <span
                    className="shrink-0 text-[11px] font-semibold tabular-nums"
                    style={{ color: "var(--accent)" }}
                  >
                    {user.usagePercent.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
