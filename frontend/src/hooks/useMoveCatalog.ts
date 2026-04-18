import { useQuery } from "@tanstack/react-query";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function useMoveCatalog() {
  return useQuery({
    queryKey: queryKeys.moveCatalog(),
    queryFn: () => ipc.getMoveCatalog(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });
}

export function useMoveSummary() {
  const { data } = useMoveCatalog();
  return (name: string | null | undefined) => {
    if (!name || !data) return null;
    return data[normalizeKey(name)] ?? null;
  };
}
