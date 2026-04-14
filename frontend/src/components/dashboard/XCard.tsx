import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";

interface Props {
  handle: string;
  url: string;
  description?: string;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function XCard({ handle, url, description }: Props) {
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
        <XIcon className="h-5 w-5" />
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
