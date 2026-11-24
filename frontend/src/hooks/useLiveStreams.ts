import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

/**
 * Every configured live screen, including offline ones. Keeping the offline
 * entries lets the panel say which channel has no broadcast instead of hiding
 * the whole section.
 */
export function useLiveStreams() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.liveStreams,
    queryFn: () => ipc.getLiveStreams(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  // A normal refetch still reuses the backend HTTP cache. The explicit refresh
  // must bypass it so a false live/scheduled result disappears immediately.
  const refetchForce = () =>
    qc.fetchQuery({
      queryKey: queryKeys.liveStreams,
      queryFn: () => ipc.getLiveStreams(true),
      staleTime: 0,
    });
  return { ...query, refetchForce };
}
