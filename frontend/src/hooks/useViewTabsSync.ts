import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { routeLabel } from "../lib/routes";
import { useViewTabsStore } from "../stores/viewTabsStore";

/**
 * Keeps the active tab's path and label in sync with the router. Navigation
 * inside a tab updates that tab; switching tabs is handled by the tab actions.
 */
export function useViewTabsSync() {
  const location = useLocation();
  const sync = useViewTabsStore((s) => s.syncActive);
  useEffect(() => {
    sync(location.pathname, routeLabel(location.pathname) ?? "app.name");
  }, [location.pathname, sync]);
}
