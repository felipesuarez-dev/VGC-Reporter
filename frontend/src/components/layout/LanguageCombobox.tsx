import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { ipc } from "../../lib/ipc";
import { SelectionMenu, type SelectionOption } from "./SelectionMenu";

interface Props {
  variant?: "default" | "titlebar";
  /** Tighter trigger used by the mobile topbar so controls fit at 360 px. */
  compact?: boolean;
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
  return LANGUAGES.some((language) => language.code === head) ? head : "en";
}

export function LanguageCombobox({
  variant = "default",
  compact = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const current = resolveCode(i18n.language);

  const change = async (code: string) => {
    await i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
    try {
      await ipc.setSetting("language", code);
    } catch {
      // Settings may not exist on first launch; the language still changed.
    }
  };

  const options: SelectionOption[] = LANGUAGES.map((language) => ({
    id: language.code,
    label: language.label,
    keywords: language.code,
    leading: <span aria-hidden>{language.flag}</span>,
  }));
  const active = LANGUAGES.find((language) => language.code === current) ?? LANGUAGES[1];

  return (
    <SelectionMenu
      label={t("settings.language")}
      trigger={
        <>
          <span aria-hidden>{active.flag}</span>
          <span>{active.code.toUpperCase()}</span>
          {!compact && <ChevronDown className="h-3 w-3" />}
        </>
      }
      triggerClassName={cn(
        "rounded border uppercase tracking-wider",
        compact
          ? "h-8 min-w-9 justify-center gap-1 px-1 text-[10px]"
          : variant === "titlebar"
            ? "px-2 py-0.5 text-[10px]"
            : "px-2 py-0.5 text-xs",
      )}
      options={options}
      selectedId={current}
      onSelect={(code) => void change(code)}
      searchable
      searchPlaceholder={`${t("common.search")}…`}
      openUp={false}
      widthClass="w-64"
    />
  );
}
