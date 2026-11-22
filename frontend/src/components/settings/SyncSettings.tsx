import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Copy, Loader2, QrCode, ScanLine, Upload } from "lucide-react";
import QRCode from "qrcode";
import { scan, Format } from "@tauri-apps/plugin-barcode-scanner";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import type { SyncBundle, SyncSession, Team } from "../../lib/types";

const UI_KEYS = ["vgc-ui", "vgc-dashboard", "vgc-playback"];

export type ConflictMode = "rename" | "replace" | "skip";

export function normalizeTeamName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export interface PreparedImport {
  bundle: SyncBundle;
  deleteIds: number[];
  conflicts: number;
}

/**
 * Resolve what to do with incoming teams whose name already exists locally.
 * Pure so the three choices are easy to test and impossible to apply by
 * accident: the caller performs the deletions only after the user confirms.
 */
export function prepareImport(
  bundle: SyncBundle,
  existing: Team[],
  mode: ConflictMode,
): PreparedImport {
  const byName = new Map<string, Team>();
  for (const team of existing) {
    const key = normalizeTeamName(team.name);
    if (!byName.has(key)) byName.set(key, team);
  }
  const conflicts = bundle.teams.filter((team) =>
    byName.has(normalizeTeamName(team.name)),
  );
  if (mode === "skip") {
    return {
      bundle: {
        ...bundle,
        teams: bundle.teams.filter(
          (team) => !byName.has(normalizeTeamName(team.name)),
        ),
      },
      deleteIds: [],
      conflicts: conflicts.length,
    };
  }
  if (mode === "replace") {
    const deleteIds = [
      ...new Set(
        conflicts
          .map((team) => byName.get(normalizeTeamName(team.name))?.id)
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    return { bundle, deleteIds, conflicts: conflicts.length };
  }
  const suffix = new Date().toLocaleDateString();
  return {
    bundle: {
      ...bundle,
      teams: bundle.teams.map((team) =>
        byName.has(normalizeTeamName(team.name))
          ? { ...team, name: `${team.name} · sync ${suffix}` }
          : team,
      ),
    },
    deleteIds: [],
    conflicts: conflicts.length,
  };
}

function collectUi(): string {
  const out: Record<string, unknown> = {};
  for (const key of UI_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) out[key] = JSON.parse(raw);
    } catch {
      // Ignore a malformed local store; sync must not fail because of it.
    }
  }
  return JSON.stringify(out);
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export function SyncSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: existing = [] } = useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: () => ipc.listTeams(),
  });
  const [session, setSession] = useState<SyncSession | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [bundle, setBundle] = useState<SyncBundle | null>(null);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("rename");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setQr(null);
      return;
    }
    void QRCode.toDataURL(session.url, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [session]);

  const conflictCount = useMemo(
    () =>
      bundle
        ? prepareImport(bundle, existing, conflictMode).conflicts
        : 0,
    [bundle, existing, conflictMode],
  );

  const startSend = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setSession(await ipc.syncStartSend(collectUi()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const fetchBundle = async (source: "url" | "code") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setBundle(
        source === "url"
          ? await ipc.syncFetch(input.trim())
          : await ipc.syncFetchByCode(code.trim()),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const scanQr = async () => {
    setError(null);
    try {
      const result = await scan({ windowed: true, formats: [Format.QRCode] });
      if (result?.content) {
        setInput(result.content);
        setBundle(await ipc.syncFetch(result.content));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const importBundle = async () => {
    if (!bundle) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = prepareImport(bundle, existing, conflictMode);
      if (prepared.bundle.teams.length === 0 && conflictCount > 0) {
        setMessage(t("settings.sync_nothing"));
        setBundle(null);
        return;
      }
      for (const id of prepared.deleteIds) {
        await ipc.deleteTeam(id);
      }
      const result = await ipc.syncImport(prepared.bundle);
      try {
        const ui = JSON.parse(bundle.ui_json) as Record<string, unknown>;
        for (const key of UI_KEYS) {
          if (ui[key]) localStorage.setItem(key, JSON.stringify(ui[key]));
        }
      } catch {
        // UI prefs are optional.
      }
      await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setMessage(
        t("settings.sync_done", {
          teams: result.teams_imported,
          settings: result.settings_imported,
        }),
      );
      setBundle(null);
      setInput("");
      setCode("");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t("settings.sync_copied"));
    } catch {
      setError(t("settings.sync_copy_failed"));
    }
  };

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <QrCode size={16} style={{ color: "var(--accent)" }} />
        <div>
          <div className="label">{t("settings.sync")}</div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {t("settings.sync_hint")}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn-ghost text-xs" onClick={() => void startSend()} disabled={busy}>
          {busy ? <Loader2 size={13} className="mr-1 animate-spin" /> : <QrCode size={13} className="mr-1" />}
          {t("settings.sync_send")}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={() => void scanQr()} disabled={!isAndroid()}>
          <ScanLine size={13} className="mr-1" />
          {t("settings.sync_scan")}
        </button>
      </div>

      {session && (
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap gap-3">
            {qr && <img src={qr} alt="" className="h-40 w-40 rounded bg-white p-1" />}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                {t("settings.sync_code")}
              </div>
              <div className="font-mono text-lg font-bold tracking-widest">{session.code}</div>
              <div className="break-all text-[10px]" style={{ color: "var(--text-muted)" }}>{session.url}</div>
              <button type="button" className="btn-ghost mt-1 text-[10px]" onClick={() => void copy(session.url)}>
                <Copy size={11} className="mr-1" /> {t("settings.sync_copy")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="label" htmlFor="sync-code">{t("settings.sync_receive_code")}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="sync-code"
            className="input h-9 flex-1 font-mono text-sm uppercase tracking-widest"
            placeholder="ABCD2345"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="btn-primary h-9 text-xs"
            onClick={() => void fetchBundle("code")}
            disabled={code.trim().length !== 8 || busy}
          >
            <Upload size={13} className="mr-1" />
            {t("settings.sync_fetch_code")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="label" htmlFor="sync-url">{t("settings.sync_receive")}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="sync-url"
            className="input h-9 flex-1 font-mono text-[11px]"
            placeholder="http://192.168.1.10:.../bundle?token=..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button type="button" className="btn-primary h-9 text-xs" onClick={() => void fetchBundle("url")} disabled={!input.trim() || busy}>
            <Upload size={13} className="mr-1" />
            {t("settings.sync_fetch")}
          </button>
        </div>
      </div>

      {bundle && (
        <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)" }}>
          <p className="text-xs font-semibold">{t("settings.sync_preview")}</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {t("settings.sync_preview_detail", {
              teams: bundle.teams.length,
              settings: Object.keys(bundle.settings).length,
            })}
          </p>
          {conflictCount > 0 && (
            <div
              className="space-y-2 rounded-md border p-2"
              style={{
                borderColor: "var(--warning)",
                backgroundColor: "color-mix(in srgb, var(--warning) 10%, transparent)",
              }}
            >
              <p className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--warning)" }}>
                <AlertTriangle size={12} />
                {t("settings.sync_conflicts", { count: conflictCount })}
              </p>
              <div className="grid gap-1 sm:grid-cols-3">
                {(["rename", "replace", "skip"] as const).map((mode) => (
                  <label key={mode} className="flex items-start gap-2 text-[11px]">
                    <input
                      type="radio"
                      name="sync-conflict"
                      className="mt-0.5"
                      checked={conflictMode === mode}
                      onChange={() => setConflictMode(mode)}
                    />
                    <span>
                      <span className="block font-medium">{t(`settings.sync_conflict_${mode}`)}</span>
                      <span style={{ color: "var(--text-dim)" }}>{t(`settings.sync_conflict_${mode}_hint`)}</span>
                    </span>
                  </label>
                ))}
              </div>
              {conflictMode === "replace" && (
                <p className="text-[10px]" style={{ color: "var(--danger)" }}>
                  {t("settings.sync_replace_warning", { count: conflictCount })}
                </p>
              )}
            </div>
          )}
          <button type="button" className="btn-primary text-xs" onClick={() => void importBundle()} disabled={busy}>
            {busy ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
            {t("settings.sync_import")}
          </button>
        </div>
      )}

      {message && <p className="text-xs" style={{ color: "var(--success)" }}>{message}</p>}
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>{t("settings.sync_lan_note")}</p>
    </section>
  );
}
