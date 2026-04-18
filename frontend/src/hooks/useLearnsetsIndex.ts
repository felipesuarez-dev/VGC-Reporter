import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

export function useLearnsetsIndex() {
  return useQuery({
    queryKey: queryKeys.learnsetsIndex(),
    queryFn: () => ipc.getLearnsetsIndex(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}
