import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useNavHistoryStore } from "../stores/navHistoryStore";

export function useNavHistorySync() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const sync = useNavHistoryStore((s) => s.sync);
  useEffect(() => {
    sync(location.pathname, navigationType);
  }, [location.pathname, navigationType, sync]);
}
