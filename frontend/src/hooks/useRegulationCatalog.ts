import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import {
  activeRegulation,
  formatOptionFromInfo,
  sortRegulationOptions,
} from "../lib/regulations";
import type { FormatOption, RegulationInfo } from "../lib/types";
import { useDashboardStore } from "../stores/dashboardStore";

/** Re-render once a minute so the regulation switch does not need a reload. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function useRegulationCatalog(): {
  regulations: RegulationInfo[];
  active: RegulationInfo | null;
  options: FormatOption[];
  isLoading: boolean;
  refresh: () => Promise<unknown>;
} {
  const { t } = useTranslation();
  const now = useNow();
  const favorite = useDashboardStore((s) => s.favoriteFormat);
  const showArchived = useDashboardStore((s) => s.showArchived);
  const formatPinned = useDashboardStore((s) => s.formatPinned);
  const followActive = useDashboardStore((s) => s.followActive);
  const query = useQuery({
    queryKey: queryKeys.regulations,
    queryFn: () => ipc.getRegulations(),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });

  const regulations = query.data ?? [];
  const active = useMemo(
    () => activeRegulation(regulations, now),
    [regulations, now],
  );

  useEffect(() => {
    if (!active || formatPinned) return;
    if (useDashboardStore.getState().format !== active.id) {
      followActive(active.id);
    }
  }, [active, followActive, formatPinned]);

  const options = useMemo(() => {
    const built = regulations.map((r) => formatOptionFromInfo(t, r, now));
    return sortRegulationOptions(
      built,
      favorite,
      showArchived,
      now,
      regulations,
    );
  }, [regulations, favorite, showArchived, now, t]);

  return {
    regulations,
    active,
    options,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function useRegulationStatus() {
  return useQuery({
    queryKey: queryKeys.regulationStatus,
    queryFn: () => ipc.getRegulationStatus(),
    staleTime: 5 * 60 * 1000,
  });
}
