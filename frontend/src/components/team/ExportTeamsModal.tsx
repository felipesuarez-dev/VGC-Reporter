import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Download, X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import type { Team } from "../../lib/types";

interface Props {
  teams: Team[];
  onClose: () => void;
}

export function ExportTeamsModal({ teams, onClose }: Props) {
  const { t } = useTranslation();
  const initialSelected = new Set<number>(
    teams.map((tt) => tt.id).filter((id): id is number => id != null),
  );
  const [selected, setSelected] = useState<Set<number>>(initialSelected);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelected(
      new Set(teams.map((tt) => tt.id).filter((id): id is number => id != null)),
    );
  const selectNone = () => setSelected(new Set());

  const buildPaste = async (): Promise<string> => {
    const chunks: string[] = [];
    for (const team of teams) {
      if (team.id == null || !selected.has(team.id)) continue;
      const text = await ipc.exportTeamToShowdown(team);
      const header = `=== ${team.name} ===\n`;
      chunks.push(header + text);
    }
    return chunks.join("\n\n");
  };

  const doCopy = async () => {
    setError(null);
    try {
      const paste = await buildPaste();
      if (!paste.trim()) {
        setError(t("my_teams.export_empty"));
        return;
      }
      await navigator.clipboard.writeText(paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(String(e));
    }
  };

  const doDownload = async () => {
    setError(null);
    try {
      const paste = await buildPaste();
      if (!paste.trim()) {
        setError(t("my_teams.export_empty"));
        return;
      }
      const blob = new Blob([paste], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vgc-reporter-teams-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("my_teams.export_title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
            aria-label={t("common.close")}
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("my_teams.export_hint")}
        </p>
        <div className="mt-2 flex gap-2 text-[11px]">
          <button
            type="button"
            onClick={selectAll}
            className="btn-ghost text-[11px]"
          >
            {t("my_teams.select_all")}
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="btn-ghost text-[11px]"
          >
            {t("my_teams.select_none")}
          </button>
        </div>
        <ul className="mt-2 flex-1 overflow-y-auto rounded-md border" style={{ borderColor: "var(--border)" }}>
          {teams.map((team) => {
            if (team.id == null) return null;
            const checked = selected.has(team.id);
            return (
              <li
                key={team.id}
                className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(team.id!)}
                  />
                  <span className="truncate text-sm" style={{ color: "var(--text)" }}>
                    {team.name}
                  </span>
                </label>
                <span
                  className="shrink-0 text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {team.members.filter((m) => m.species.trim() !== "").length}/6
                </span>
              </li>
            );
          })}
        </ul>
        {error && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={doDownload}
            disabled={selected.size === 0}
            className="btn-ghost text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={12} className="mr-1 inline" />
            {t("my_teams.export_download")}
          </button>
          <button
            type="button"
            onClick={doCopy}
            disabled={selected.size === 0}
            className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check size={12} className="mr-1 inline" />
                {t("my_teams.export_copied")}
              </>
            ) : (
              <>
                <Copy size={12} className="mr-1 inline" />
                {t("my_teams.export_copy")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
