import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

export function usePikalyticsEntry(species: string | null | undefined) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("es") ? "es" : "en";
  return useQuery({
    queryKey: queryKeys.pikalyticsEntry(species ?? "", lang),
    queryFn: () => ipc.getPikalyticsEntry(species!, lang),
    enabled: Boolean(species),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
