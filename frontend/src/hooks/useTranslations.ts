import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { LocalizedName, TranslationTable } from "../lib/types";

export type LocalizeKind = "ability" | "move" | "item";

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tableFor(
  data: TranslationTable | undefined,
  kind: LocalizeKind,
): { [key: string]: LocalizedName | undefined } | undefined {
  if (!data) return undefined;
  switch (kind) {
    case "ability":
      return data.abilities;
    case "move":
      return data.moves;
    case "item":
      return data.items;
  }
}

export function useTranslationTable() {
  return useQuery({
    queryKey: queryKeys.translationTable(),
    queryFn: () => ipc.getTranslationTable(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}

const SUPPORTED_LOCALES = ["es", "en", "pt", "it", "fr"] as const;
type LocLang = (typeof SUPPORTED_LOCALES)[number];

/** Map an i18next language tag (`es`, `pt-BR`, `fr-FR`, …) to the LocalizedName
 *  field whose value should be displayed. Anything we don't recognize falls
 *  back to English. */
function resolveLocale(raw: string): LocLang {
  const head = raw.slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(head)
    ? (head as LocLang)
    : "en";
}

export function useLocalize() {
  const { data } = useTranslationTable();
  const { i18n } = useTranslation();
  const lang = resolveLocale(i18n.language);
  return useCallback(
    (kind: LocalizeKind, name: string | null | undefined): string => {
      if (!name) return "";
      const table = tableFor(data, kind);
      if (!table) return name;
      const entry = table[normalizeKey(name)];
      if (!entry) return name;
      // Per-locale lookup with EN fallback at every step. The backend builds
      // these structs with the EN value already populated in the per-locale
      // field when the upstream lacked a translation, so this fallback
      // chain is defensive — but cheap.
      return entry[lang] || entry.en || name;
    },
    [data, lang],
  );
}
