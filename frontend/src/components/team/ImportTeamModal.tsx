import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";

interface Props {
  onClose: () => void;
}

const TEAM_DELIMITER = /^=== (.+) ===$/m;

export function ImportTeamModal({ onClose }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Split a paste containing one or more teams. Multi-team pastes use a
   *  `=== Team Name ===` separator (matching what ExportTeamsModal emits).
   *  Single-team pastes are returned as-is. */
  const splitTeams = (raw: string): { name: string | null; body: string }[] => {
    const lines = raw.split(/\r?\n/);
    const out: { name: string | null; body: string }[] = [];
    let currentName: string | null = null;
    let currentLines: string[] = [];
    const push = () => {
      const body = currentLines.join("\n").trim();
      if (body) out.push({ name: currentName, body });
      currentLines = [];
    };
    for (const line of lines) {
      const m = line.match(TEAM_DELIMITER);
      if (m) {
        push();
        currentName = m[1].trim();
      } else {
        currentLines.push(line);
      }
    }
    push();
    return out.length === 0 ? [{ name: null, body: raw.trim() }] : out;
  };

  const doImport = async () => {
    setError(null);
    setImported(0);
    if (!text.trim()) {
      setError(t("my_teams.import_empty"));
      return;
    }
    setBusy(true);
    try {
      const parts = splitTeams(text);
      let count = 0;
      for (const { name, body } of parts) {
        if (!body) continue;
        const team = await ipc.importShowdownText(body);
        if (name) team.name = name;
        team.id = null;
        await ipc.saveTeam(team);
        count += 1;
      }
      setImported(count);
      qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setTimeout(onClose, 800);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setError(message);
    } finally {
      setBusy(false);
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
        className="card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("my_teams.import_title")}
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
          {t("my_teams.import_hint")}
        </p>
        <textarea
          className="input mt-2 min-h-[260px] flex-1 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("my_teams.import_placeholder")}
          spellCheck={false}
        />
        {error && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        {imported > 0 && !error && (
          <p
            className="mt-2 inline-flex items-center text-[11px]"
            style={{ color: "var(--accent)" }}
          >
            <Check size={12} className="mr-1" />
            {t("my_teams.import_done", { count: imported })}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={doImport}
            disabled={busy || !text.trim()}
            className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={12} className="mr-1 inline" />
            {t("my_teams.import_action")}
          </button>
        </div>
      </div>
    </div>
  );
}
