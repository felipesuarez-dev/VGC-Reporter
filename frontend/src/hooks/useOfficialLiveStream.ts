import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

/**
 * Shared query for the official live broadcast. Both the Feed panel frame
 * (to auto-collapse when nothing is live) and the player itself observe the
 * same cache entry, so there is only one network request.
 */
export function useOfficialLiveStream() {
  return useQuery({
    queryKey: queryKeys.officialStream,
    queryFn: () => ipc.getOfficialLiveStream(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
