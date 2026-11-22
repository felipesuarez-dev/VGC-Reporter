import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

/**
 * Shared upcoming-events query. `null` means all countries; the same cache
 * entry feeds the list, the calendar and the tournament preview modal.
 */
export function useUpcomingTournaments(country: string | null) {
  return useQuery({
    queryKey: queryKeys.upcomingTournaments(country ?? undefined),
    queryFn: () => ipc.listUpcomingTournaments(country),
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
}
