import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { EntityDescriptions, LocalizedDescription } from "../lib/types";
import type { LocalizeKind } from "./useTranslations";

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tableFor(
  data: EntityDescriptions | undefined,
  kind: LocalizeKind,
): { [key: string]: LocalizedDescription | undefined } | undefined {
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

export function useEntityDescriptions() {
  return useQuery({
    queryKey: queryKeys.entityDescriptions(),
    queryFn: () => ipc.getEntityDescriptions(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}

const SUPPORTED_LOCALES = ["es", "en", "pt", "it", "fr"] as const;
type LocLang = (typeof SUPPORTED_LOCALES)[number];

function resolveLocale(raw: string): LocLang {
  const head = raw.slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(head)
    ? (head as LocLang)
    : "en";
}

export function useDescribe() {
  const { data } = useEntityDescriptions();
  const { i18n } = useTranslation();
  const lang = resolveLocale(i18n.language);
  return useCallback(
    (kind: LocalizeKind, name: string | null | undefined): string | null => {
      if (!name) return null;
      const table = tableFor(data, kind);
      if (!table) return null;
      const entry = table[normalizeKey(name)];
      if (!entry) return null;
      return entry[lang] || entry.en || null;
    },
    [data, lang],
  );
}
