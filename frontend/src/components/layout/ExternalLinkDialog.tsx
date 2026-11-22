import { ExternalLink, Mail, Phone, ShieldAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExternalLinkStore } from "../../stores/externalLinkStore";
import { performExternalOpen } from "../../lib/openExternal";
import { useModalBack } from "../../hooks/useModalBack";

/** Global confirmation shown for every link that leaves the app. */
export function ExternalLinkDialog() {
  const { t } = useTranslation();
  const pending = useExternalLinkStore((s) => s.pending);
  const clear = useExternalLinkStore((s) => s.clear);

  useModalBack(Boolean(pending), () => {
    pending?.resolve(false);
    clear();
  });

  if (!pending) return null;

  const isMail = pending.kind === "mail";
  const isPhone = pending.kind === "phone";
  const Icon = isMail ? Mail : isPhone ? Phone : ExternalLink;
  const message = isMail
    ? t("external_link.mail")
    : isPhone
      ? t("external_link.phone")
      : t("external_link.body");

  const finish = (opened: boolean) => {
    pending.resolve(opened);
    clear();
  };

  const confirm = async () => {
    const opened = await performExternalOpen(pending.url);
    finish(opened);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("external_link.title")}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
      onClick={() => finish(false)}
    >
      <div
        className="relative w-full max-w-md rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={() => finish(false)}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 pr-7">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold">{t("external_link.title")}</h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {message}
            </p>
          </div>
        </div>
        <p
          className="mt-4 break-all rounded-lg border px-3 py-2 font-mono text-[11px]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg)",
            color: "var(--text-muted)",
          }}
          data-testid="external-link-url"
        >
          {pending.url}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={() => finish(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => void confirm()}>
            <ShieldAlert size={13} className="mr-1" />
            {t("external_link.open")}
          </button>
        </div>
      </div>
    </div>
  );
}
