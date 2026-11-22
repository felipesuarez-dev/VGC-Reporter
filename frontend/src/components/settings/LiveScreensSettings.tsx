import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Check,
  MonitorPlay,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
  defaults: string[];
  max?: number;
}

function parseUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export function LiveScreensSettings({
  value,
  onChange,
  onSave,
  defaults,
  max = 12,
}: Props) {
  const { t } = useTranslation();
  const urls = parseUrls(value);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(value);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && value) {
      setSavedSnapshot(value);
      setHydrated(true);
    }
  }, [hydrated, value]);

  const dirty = value !== savedSnapshot;
  const commit = (next: string[]) => onChange(next.join("\n"));
  const add = () => {
    const url = draft.trim();
    if (!url || urls.length >= max || urls.includes(url)) return;
    commit([...urls, url]);
    setDraft("");
  };
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const remove = (index: number) => {
    commit(urls.filter((_, current) => current !== index));
    if (editing === index) setEditing(null);
  };
  const startEdit = (index: number) => {
    setEditing(index);
    setEditValue(urls[index]);
  };
  const saveEdit = () => {
    if (editing === null) return;
    const next = [...urls];
    next[editing] = editValue.trim();
    commit(next.filter(Boolean));
    setEditing(null);
  };
  const save = async () => {
    await onSave();
    setSavedSnapshot(value);
  };
  const reset = () => {
    const next = defaults.join("\n");
    onChange(next);
  };

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <MonitorPlay size={16} style={{ color: "var(--accent)" }} />
        <div>
          <div className="label">{t("settings.live_screens")}</div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {t("settings.live_screens_hint")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input h-9 flex-1 text-xs"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={t("settings.live_screens_placeholder_single")}
          spellCheck={false}
          autoComplete="off"
          aria-label={t("settings.live_screens_placeholder_single")}
        />
        <button
          type="button"
          className="btn-primary h-9 text-xs"
          onClick={add}
          disabled={!draft.trim() || urls.length >= max}
        >
          <Plus size={13} className="mr-1" />
          {t("settings.live_screens_add")}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
        <span>{t("settings.live_screens_order_hint")}</span>
        <span className="font-mono">
          {urls.length}/{max}
        </span>
      </div>

      {urls.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
          {t("settings.live_screens_empty")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {urls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                style={{ backgroundColor: "var(--bg-elev-strong)", color: "var(--text-muted)" }}
              >
                {index + 1}
              </span>
              {editing === index ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row">
                  <input
                    className="input h-8 min-w-0 flex-1 text-xs"
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveEdit();
                      if (event.key === "Escape") setEditing(null);
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      onClick={saveEdit}
                      title={t("common.save")}
                      aria-label={t("common.save")}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      onClick={() => setEditing(null)}
                      title={t("common.cancel")}
                      aria-label={t("common.cancel")}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={url}>
                  {url}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title={t("feed.move_up")}
                  aria-label={t("feed.move_up")}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => move(index, 1)}
                  disabled={index === urls.length - 1}
                  title={t("feed.move_down")}
                  aria-label={t("feed.move_down")}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => startEdit(index)}
                  title={t("settings.live_screens_edit")}
                  aria-label={t("settings.live_screens_edit")}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
                  style={{ color: "var(--danger)" }}
                  onClick={() => remove(index)}
                  title={t("settings.live_screens_delete")}
                  aria-label={t("settings.live_screens_delete")}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary h-9 text-xs"
          onClick={save}
          disabled={!dirty}
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          className="btn-ghost h-9 text-xs"
          onClick={reset}
        >
          <RotateCcw size={12} className="mr-1" />
          {t("settings.live_screens_reset")}
        </button>
        {dirty && (
          <span className="text-[10px]" style={{ color: "var(--warning)" }}>
            {t("settings.live_screens_dirty")}
          </span>
        )}
      </div>
    </section>
  );
}
