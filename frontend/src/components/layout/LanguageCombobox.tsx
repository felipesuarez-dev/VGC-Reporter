import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { ipc } from "../../lib/ipc";

interface Props {
  variant?: "default" | "titlebar";
}

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

function resolveCode(raw: string): string {
  const head = raw.slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === head) ? head : "en";
}

export function LanguageCombobox({ variant = "default" }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = resolveCode(i18n.language);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const change = async (code: string) => {
    await i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
    try {
      await ipc.setSetting("language", code);
    } catch {
      /* settings table may not exist on first launch; safe to ignore */
    }
    setOpen(false);
  };

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[1];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 rounded border uppercase tracking-wider transition-colors hover:bg-[var(--bg-elev-strong)]",
          variant === "titlebar"
            ? "px-2 py-0.5 text-[10px]"
            : "px-2 py-0.5 text-xs",
        )}
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <span>{active.flag}</span>
        <span>{active.code.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border shadow-xl"
          style={{
            backgroundColor: "var(--bg-elev)",
            borderColor: "var(--border)",
          }}
        >
          <Command label="Language" loop>
            <Command.Input
              placeholder="…"
              className="w-full border-b bg-transparent px-2 py-1.5 text-xs outline-none"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty
                className="px-2 py-2 text-center text-[11px]"
                style={{ color: "var(--text-dim)" }}
              >
                —
              </Command.Empty>
              {LANGUAGES.map((lang) => {
                const selected = lang.code === current;
                return (
                  <Command.Item
                    key={lang.code}
                    value={`${lang.label} ${lang.code}`}
                    onSelect={() => change(lang.code)}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                    style={{ color: "var(--text)" }}
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1 truncate">{lang.label}</span>
                    {selected && (
                      <Check
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--accent)" }}
                      />
                    )}
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
