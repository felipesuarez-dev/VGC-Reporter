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

export function useLocalize() {
  const { data } = useTranslationTable();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useCallback(
    (kind: LocalizeKind, name: string | null | undefined): string => {
      if (!name) return "";
      const table = tableFor(data, kind);
      if (!table) return name;
      const entry = table[normalizeKey(name)];
      if (!entry) return name;
      if (lang === "es") return entry.es || entry.en || name;
      return entry.en || name;
    },
    [data, lang],
  );
}
