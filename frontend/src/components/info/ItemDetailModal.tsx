import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useItemDetailStore } from "../../stores/entityDetailStore";
import { useLocalize } from "../../hooks/useTranslations";
import { useDescribe } from "../../hooks/useEntityDescriptions";
import { useModalBack } from "../../hooks/useModalBack";

export function ItemDetailModal() {
  const { t } = useTranslation();
  const name = useItemDetailStore((s) => s.name);
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

  const label = localize("item", name) || name;
  const description = describe("item", name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-xl border p-5 shadow-2xl"
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
          aria-label={t("search.close")}
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
          {label}
        </h2>
        <div
          className="mt-0.5 text-[10px] uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {t("entity.item")}
        </div>
        {description && (
          <p className="mt-3 text-sm" style={{ color: "var(--text)" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
