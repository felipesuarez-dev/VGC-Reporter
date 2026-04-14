import { X, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_VERSION } from "../../lib/version";

interface Props {
  open: boolean;
  onClose: () => void;
}

const REPO_URL = "https://github.com/felipesuarez-dev/VGC-Reporter";

export function AboutModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  const openRepo = async () => {
    try {
      await openUrl(REPO_URL);
    } catch {
      window.open(REPO_URL, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("about.title")}</h2>
          <button
            className="btn-ghost p-1"
            onClick={onClose}
            aria-label={t("pokemon_detail.close")}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PumaSoft"
            className="h-14 w-14 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <div className="text-base font-bold">{t("app.name")}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("app.tagline")}
            </div>
          </div>
        </div>
        <dl className="mt-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>
              {t("app.version")}
            </dt>
            <dd>{APP_VERSION}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>{t("about.author")}</dt>
            <dd>PumaSoft</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>{t("about.year")}</dt>
            <dd>2026</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {t("about.description")}
        </p>
        <button
          type="button"
          onClick={openRepo}
          className="btn-ghost mt-3 w-full justify-center text-xs"
        >
          <ExternalLink size={12} className="mr-1" />
          {t("about.view_repo")}
        </button>
      </div>
    </div>
  );
}
