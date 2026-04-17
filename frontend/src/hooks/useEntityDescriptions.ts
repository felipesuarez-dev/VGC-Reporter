import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { EntityDescriptions } from "../lib/types";
import type { LocalizeKind } from "./useTranslations";

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tableFor(
  data: EntityDescriptions | undefined,
  kind: LocalizeKind,
): { [key: string]: string | undefined } | undefined {
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

export function useDescribe() {
  const { data } = useEntityDescriptions();
  return useCallback(
    (kind: LocalizeKind, name: string | null | undefined): string | null => {
      if (!name) return null;
      const table = tableFor(data, kind);
      if (!table) return null;
      return table[normalizeKey(name)] ?? null;
    },
    [data],
  );
}
