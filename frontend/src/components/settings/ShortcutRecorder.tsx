import { useEffect, useRef, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeShortcut } from "../../lib/shortcut";

interface Props {
  value: string;
  onChange: (shortcut: string) => void;
}

/**
 * Click, then press the combination. We capture at the window level so the
 * global Tables shortcut does not fire while the recorder is listening.
 * Escape cancels; Backspace restores Ctrl+T.
 */
export function ShortcutRecorder({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      if (event.key === "Backspace") {
        onChange("Ctrl+T");
        setRecording(false);
        return;
      }
      const requiresModifier = event.ctrlKey || event.metaKey || event.altKey;
      const shortcut = normalizeShortcut(event);
      if (!requiresModifier || !shortcut) return;
      onChange(shortcut);
      setRecording(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onChange, recording]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setRecording((value) => !value)}
        className="flex h-9 min-w-40 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors"
        style={{
          borderColor: recording ? "var(--accent)" : "var(--border)",
          backgroundColor: recording
            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
            : "var(--bg)",
          color: recording ? "var(--accent)" : "var(--text)",
        }}
        aria-pressed={recording}
      >
        <Keyboard size={14} />
        {recording ? (
          <span className="animate-pulse">
            {t("settings.quick_tables_shortcut_recording")}
          </span>
        ) : (
          value.split("+").map((part, index) => (
            <span key={`${part}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <span style={{ color: "var(--text-dim)" }}>+</span>
              )}
              <kbd
                className="rounded border px-1.5 py-0.5 text-[10px] font-mono"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-elev-strong)",
                }}
              >
                {part}
              </kbd>
            </span>
          ))
        )}
      </button>
      {value !== "Ctrl+T" && (
        <button
          type="button"
          className="btn-ghost h-9 text-[11px]"
          onClick={() => onChange("Ctrl+T")}
        >
          <RotateCcw size={13} className="mr-1" />
          Ctrl+T
        </button>
      )}
      <p className="w-full text-[10px]" style={{ color: "var(--text-dim)" }}>
        {t("settings.quick_tables_shortcut_hint")}
      </p>
    </div>
  );
}
