import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

/**
 * Extra organizer/price fields read from the official event page. Best effort:
 * the official site may return an anti-bot page, in which case the event card
 * keeps using the data from the event locator.
 */
export function useOfficialEventDetails(url: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.officialEvent(url),
    queryFn: () => ipc.getOfficialEventDetails(url),
    enabled: enabled && Boolean(url),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 0,
  });
}
