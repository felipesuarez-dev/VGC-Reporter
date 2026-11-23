import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  Copy,
  Download,
  KeyRound,
  Loader2,
  QrCode,
  Send,
  Settings,
  ShieldCheck,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  checkPermissions,
  openAppSettings,
  requestPermissions,
  scan,
  Format,
} from "@tauri-apps/plugin-barcode-scanner";
import { listen } from "@tauri-apps/api/event";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import {
  formatSyncCode,
  formatSyncCountdown,
  isSyncTerminal,
  normalizeSyncCode,
  parseSyncTicket,
  prepareImport,
  secondsRemaining,
  SYNC_STATE_ORDER,
  type ConflictMode,
} from "../../lib/sync";
import type {
  SyncBundle,
  SyncSession,
  SyncSessionStatus,
  SyncState,
} from "../../lib/types";

const UI_KEYS = ["vgc-ui", "vgc-dashboard", "vgc-playback"];

function collectUi(): string {
  const out: Record<string, unknown> = {};
  for (const key of UI_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) out[key] = JSON.parse(raw);
    } catch {
      // A malformed local store must not block sync.
    }
  }
  return JSON.stringify(out);
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function statusFromSession(session: SyncSession): SyncSessionStatus {
  return {
    code: session.code,
    state: "waiting",
    expires_at: session.expires_at,
    teams: session.teams,
    settings: session.settings,
    ui_stores: session.ui_stores,
    error: null,
  };
}

function stateLabelKey(state: SyncState): string {
  return `settings.sync_state_${state}`;
}

function StateBadge({
  state,
  error,
}: {
  state: SyncState;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const tone =
    state === "error" || state === "expired" || state === "cancelled"
      ? "danger"
      : state === "received" || state === "imported"
        ? "success"
        : "accent";
  const busy = state === "connected" || state === "transferring";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor:
          tone === "danger"
            ? "color-mix(in srgb, var(--danger) 14%, transparent)"
            : tone === "success"
              ? "color-mix(in srgb, var(--success) 14%, transparent)"
              : "var(--accent-soft)",
        color:
          tone === "danger"
            ? "var(--danger)"
            : tone === "success"
              ? "var(--success)"
              : "var(--accent)",
      }}
      title={error ?? undefined}
    >
      {busy ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
      {t(stateLabelKey(state))}
    </span>
  );
}

function Progress({ state }: { state: SyncState }) {
  const { t } = useTranslation();
  const current = SYNC_STATE_ORDER.indexOf(state);
  const terminal = isSyncTerminal(state);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[9px]" aria-label={t("settings.sync_progress")}>
      {SYNC_STATE_ORDER.map((entry, index) => {
        const active = state === entry;
        const done = terminal
          ? state === "imported" || index < SYNC_STATE_ORDER.length - 1
          : current > index;
        return (
          <li key={entry} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden style={{ color: "var(--text-dim)" }}>
                ·
              </span>
            )}
            <span
              className="rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: active
                  ? "var(--accent-soft)"
                  : done
                    ? "color-mix(in srgb, var(--success) 12%, transparent)"
                    : "transparent",
                color: active
                  ? "var(--accent)"
                  : done
                    ? "var(--success)"
                    : "var(--text-dim)",
                fontWeight: active ? 700 : 500,
              }}
            >
              {t(stateLabelKey(entry))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SyncSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: existing = [] } = useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: () => ipc.listTeams(),
  });
  const [mode, setMode] = useState<"send" | "receive">("send");
  const [session, setSession] = useState<SyncSession | null>(null);
  const [status, setStatus] = useState<SyncSessionStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [bundle, setBundle] = useState<SyncBundle | null>(null);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("rename");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) {
      setQr(null);
      return;
    }
    void QRCode.toDataURL(session.ticket, { margin: 1, width: 280 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await ipc.syncSessionStatus(session.code);
        if (!cancelled) setStatus(next);
      } catch {
        // The session may have been pruned while the settings page was open.
      }
    };
    void tick();
    const id = window.setInterval(() => {
      setNow(Date.now());
      void tick();
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<SyncSessionStatus>("sync-state", (event) => {
      if (!disposed && event.payload.code === session.code) {
        setStatus(event.payload);
      }
    }).then((off) => {
      if (disposed) off();
      else unlisten = off;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [session]);

  const conflictCount = useMemo(
    () => (bundle ? prepareImport(bundle, existing, conflictMode).conflicts : 0),
    [bundle, existing, conflictMode],
  );
  const remaining = secondsRemaining(
    status?.expires_at ?? session?.expires_at ?? new Date(0).toISOString(),
    now,
  );

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  const startSend = async () => {
    setBusy(true);
    resetMessages();
    try {
      const next = await ipc.syncStartSend(collectUi());
      setSession(next);
      setStatus(statusFromSession(next));
      setPermissionBlocked(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelSend = async () => {
    if (!session) return;
    try {
      setStatus(await ipc.syncCancel(session.code));
      setSession(null);
      setMessage(t("settings.sync_cancelled"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const fetchByCode = async (raw: string) => {
    const normalized = normalizeSyncCode(raw);
    if (!normalized) {
      setError(t("settings.sync_code_invalid"));
      return;
    }
    setBusy(true);
    resetMessages();
    try {
      const received = await ipc.syncFetchByCode(normalized);
      setBundle(received);
      setSourceCode(normalized);
      setCode(normalized);
      setMessage(t("settings.sync_received_ready"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const fetchByTicket = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setBusy(true);
    resetMessages();
    try {
      // Validate locally first: a malformed QR must fail before the network.
      const parsedCode = value.startsWith("vgcreporter://")
        ? parseSyncTicket(value).code
        : null;
      const received = await ipc.syncFetch(value);
      setBundle(received);
      setSourceCode(parsedCode);
      setTicket(value);
      setMessage(t("settings.sync_received_ready"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const ensureCamera = async (): Promise<boolean> => {
    setError(null);
    setPermissionBlocked(false);
    try {
      let permission = await checkPermissions();
      if (permission === "prompt") {
        permission = await requestPermissions();
      }
      if (permission !== "granted") {
        setPermissionBlocked(true);
        setError(t("settings.sync_permission_denied"));
        return false;
      }
      return true;
    } catch (e) {
      setPermissionBlocked(true);
      setError(t("settings.sync_permission_failed"));
      return false;
    }
  };

  const scanQr = async () => {
    if (!(await ensureCamera())) return;
    setBusy(true);
    resetMessages();
    try {
      const result = await scan({
        windowed: false,
        formats: [Format.QRCode],
        cameraDirection: "back",
      });
      if (result?.content) {
        await fetchByTicket(result.content);
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      if (/permission/i.test(detail)) {
        setPermissionBlocked(true);
        setError(t("settings.sync_permission_denied"));
      } else if (/busy|in use|camera/i.test(detail)) {
        setError(t("settings.sync_camera_busy"));
      } else if (/cancel/i.test(detail)) {
        setError(t("settings.sync_scan_cancelled"));
      } else {
        setError(t("settings.sync_qr_invalid"));
      }
    } finally {
      setBusy(false);
    }
  };

  const importBundle = async () => {
    if (!bundle) return;
    setBusy(true);
    resetMessages();
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
      const result = await ipc.syncImport(prepared.bundle, sourceCode);
      try {
        const ui = JSON.parse(bundle.ui_json) as Record<string, unknown>;
        for (const key of UI_KEYS) {
          if (ui[key]) localStorage.setItem(key, JSON.stringify(ui[key]));
        }
      } catch {
        // UI preferences are optional.
      }
      await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setMessage(
        t("settings.sync_done", {
          teams: result.teams_imported,
          settings: result.settings_imported,
        }),
      );
      setBundle(null);
      setCode("");
      setTicket("");
      if (session) {
        setStatus(await ipc.syncSessionStatus(session.code).catch(() => status));
      }
      window.setTimeout(() => window.location.reload(), 800);
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

  const sessionState = status?.state ?? "waiting";
  const expired = remaining === 0 || sessionState === "expired";
  const canImport = bundle !== null;

  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Wifi size={16} />
        </span>
        <div>
          <div className="label">{t("settings.sync")}</div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {t("settings.sync_hint")}
          </p>
        </div>
      </div>

      <div
        className="flex overflow-hidden rounded-lg border p-0.5"
        style={{ borderColor: "var(--border)" }}
        role="tablist"
      >
        {(
          [
            ["send", Send, t("settings.sync_send_tab")],
            ["receive", Download, t("settings.sync_receive_tab")],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className="flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: mode === id ? "var(--accent-soft)" : "transparent",
              color: mode === id ? "var(--accent)" : "var(--text-muted)",
            }}
            onClick={() => {
              setMode(id);
              resetMessages();
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl border p-3 text-[11px] leading-relaxed"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg)",
          color: "var(--text-muted)",
        }}
      >
        <p className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
          <ShieldCheck size={13} className="text-[var(--accent)]" />
          {t("settings.sync_explainer_title")}
        </p>
        <p className="mt-1">{t("settings.sync_explainer_body")}</p>
      </div>

      {mode === "send" ? (
        <div className="space-y-3">
          {!session ? (
            <>
              <button
                type="button"
                className="btn-primary w-full text-xs"
                onClick={() => void startSend()}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <Send size={14} className="mr-1" />
                )}
                {t("settings.sync_send_all")}
              </button>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("settings.sync_send_preview", {
                  teams: existing.length,
                  ui: UI_KEYS.length,
                })}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <StateBadge state={sessionState} error={status?.error} />
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-mono"
                  style={{ color: expired ? "var(--danger)" : "var(--text-muted)" }}
                >
                  <Clock size={11} />
                  {formatSyncCountdown(remaining)}
                </span>
              </div>
              <Progress state={sessionState} />
              {sessionState === "error" && status?.error && (
                <p className="w-full break-all text-[10px]" style={{ color: "var(--danger)" }}>
                  {status.error}
                </p>
              )}
              {qr && !expired ? (
                <img
                  src={qr}
                  alt={t("settings.sync_show_qr")}
                  className="h-60 w-60 rounded-xl bg-white p-2"
                />
              ) : (
                <div
                  className="flex h-60 w-60 flex-col items-center justify-center gap-2 rounded-xl border text-center text-[11px]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                >
                  <QrCode size={28} />
                  {expired ? t("settings.sync_expired") : t("settings.sync_qr_unavailable")}
                </div>
              )}
              <p className="max-w-sm text-center text-xs" style={{ color: "var(--text-muted)" }}>
                {t("settings.sync_send_qr_hint")}
              </p>
              <div className="grid w-full gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => void copy(session.code)}
                >
                  <Copy size={12} className="mr-1" />
                  {t("settings.sync_copy_code")}
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => void copy(session.ticket)}
                >
                  <Copy size={12} className="mr-1" />
                  {t("settings.sync_copy_ticket")}
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => void startSend()}
                  disabled={busy}
                >
                  <QrCode size={12} className="mr-1" />
                  {t("settings.sync_new_session")}
                </button>
              </div>
              <div className="w-full text-center">
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  {t("settings.sync_code")}
                </div>
                <div className="font-mono text-2xl font-bold tracking-[0.28em]">
                  {formatSyncCode(session.code)}
                </div>
                <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {t("settings.sync_code_hint")}
                </p>
              </div>
              <div
                className="w-full rounded-lg border px-2.5 py-2 text-[10px]"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                {t("settings.sync_send_detail", {
                  teams: session.teams,
                  settings: session.settings,
                  ui: session.ui_stores,
                })}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text-dim)" }}
                onClick={() => setAdvanced((value) => !value)}
              >
                {advanced ? <X size={12} /> : <KeyRound size={12} />}
                {t("settings.sync_advanced")}
              </button>
              {advanced && (
                <div className="w-full space-y-1 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                  <p className="break-all font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {session.ticket}
                  </p>
                  <p className="break-all font-mono text-[9px]" style={{ color: "var(--text-dim)" }}>
                    {session.url}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-ghost text-[10px]"
                      onClick={() => void copy(session.ticket)}
                    >
                      <Copy size={11} className="mr-1" />
                      {t("settings.sync_copy_ticket")}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-[10px]"
                      onClick={() => void copy(session.url)}
                    >
                      <Copy size={11} className="mr-1" />
                      {t("settings.sync_copy_url")}
                    </button>
                  </div>
                </div>
              )}
              {sessionState !== "imported" && (
                <button
                  type="button"
                  className="btn-ghost text-[10px]"
                  onClick={() => void cancelSend()}
                  disabled={isSyncTerminal(sessionState) && sessionState !== "received"}
                >
                  {t("settings.sync_cancel")}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            className="btn-primary w-full text-xs"
            onClick={() => void scanQr()}
            disabled={busy || !isAndroid()}
            title={!isAndroid() ? t("settings.sync_scan_desktop") : undefined}
          >
            {busy ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Camera size={14} className="mr-1" />
            )}
            {t("settings.sync_scan_title")}
          </button>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("settings.sync_scan_hint")}
          </p>
          {permissionBlocked && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[10px]"
              style={{
                borderColor: "var(--warning)",
                backgroundColor: "color-mix(in srgb, var(--warning) 8%, transparent)",
                color: "var(--warning)",
              }}
            >
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} />
                {t("settings.sync_permission_blocked")}
              </span>
              <button
                type="button"
                className="btn-ghost h-7 text-[10px]"
                onClick={() => void openAppSettings()}
              >
                <Settings size={11} className="mr-1" />
                {t("settings.sync_open_settings")}
              </button>
            </div>
          )}

          <div
            className="space-y-1.5 rounded-xl border p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <label className="label" htmlFor="sync-code">
              {t("settings.sync_code_title")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="sync-code"
                className="input h-11 flex-1 font-mono text-base uppercase tracking-[0.25em]"
                placeholder="AB23 CD45"
                maxLength={9}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
              <button
                type="button"
                className="btn-primary h-11 text-xs"
                onClick={() => void fetchByCode(code)}
                disabled={!normalizeSyncCode(code) || busy}
              >
                {busy ? (
                  <Loader2 size={13} className="mr-1 animate-spin" />
                ) : (
                  <Upload size={13} className="mr-1" />
                )}
                {t("settings.sync_connect")}
              </button>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("settings.sync_code_hint")}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px]"
            style={{ color: "var(--text-dim)" }}
            onClick={() => setAdvanced((value) => !value)}
          >
            {advanced ? <X size={12} /> : <KeyRound size={12} />}
            {t("settings.sync_advanced")}
          </button>
          {advanced && (
            <div className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("settings.sync_url_hint")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input h-9 flex-1 font-mono text-[10px]"
                  placeholder="vgcreporter://sync?v=1&..."
                  value={ticket}
                  onChange={(event) => setTicket(event.target.value)}
                />
                <button
                  type="button"
                  className="btn-ghost h-9 text-xs"
                  onClick={() => void fetchByTicket(ticket)}
                  disabled={!ticket.trim() || busy}
                >
                  {t("settings.sync_connect_link")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bundle && (
        <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--accent)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">{t("settings.sync_preview")}</p>
            <StateBadge state="received" />
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {t("settings.sync_preview_detail", {
              teams: bundle.teams.length,
              settings: Object.keys(bundle.settings).length,
            })}
          </p>
          {conflictCount > 0 && (
            <div
              className="space-y-2 rounded-lg border p-2"
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
                {(["rename", "replace", "skip"] as const).map((entry) => (
                  <label key={entry} className="flex items-start gap-2 text-[11px]">
                    <input
                      type="radio"
                      name="sync-conflict"
                      className="mt-0.5"
                      checked={conflictMode === entry}
                      onChange={() => setConflictMode(entry)}
                    />
                    <span>
                      <span className="block font-medium">{t(`settings.sync_conflict_${entry}`)}</span>
                      <span style={{ color: "var(--text-dim)" }}>{t(`settings.sync_conflict_${entry}_hint`)}</span>
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
          <button
            type="button"
            className="btn-primary w-full text-xs"
            onClick={() => void importBundle()}
            disabled={busy || !canImport}
          >
            {busy ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
            {t("settings.sync_import")}
          </button>
        </div>
      )}

      {message && <p className="break-all text-xs" style={{ color: "var(--success)" }}>{message}</p>}
      {error && <p className="break-all text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
        {t("settings.sync_lan_note")}
      </p>
    </section>
  );
}
