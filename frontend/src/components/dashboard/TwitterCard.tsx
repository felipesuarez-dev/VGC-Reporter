import { ExternalLink, Twitter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";

interface Props {
  handle: string;
  url: string;
  description?: string;
}

export function TwitterCard({ handle, url, description }: Props) {
  const { t } = useTranslation();
  const open = async () => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="card flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200">
        <Twitter className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-100">@{handle}</div>
        {description && (
          <div className="truncate text-xs text-slate-400">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={open}
        className="btn-ghost shrink-0 text-xs"
      >
        <ExternalLink size={12} className="mr-1" />
        {t("dashboard.open_on_x")}
      </button>
    </div>
  );
}
