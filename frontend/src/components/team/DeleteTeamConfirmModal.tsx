import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "../ui/ModalShell";

interface Props {
  teamName: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Deletion is irreversible, so it always goes through this confirmation. */
export function DeleteTeamConfirmModal({
  teamName,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  return (
    <ModalShell
      open={Boolean(teamName)}
      title={t("my_teams.delete_title")}
      icon={<AlertTriangle size={16} />}
      maxWidth="max-w-md"
      height="max-h-[70vh]"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-ghost text-xs" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn-danger text-xs"
            onClick={onConfirm}
            disabled={busy}
          >
            <Trash2 size={13} className="mr-1" />
            {busy ? t("common.loading") : t("common.delete")}
          </button>
        </>
      }
    >
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t("my_teams.delete_confirm", { name: teamName })}
      </p>
      <p className="mt-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("my_teams.delete_hint")}
      </p>
    </ModalShell>
  );
}
