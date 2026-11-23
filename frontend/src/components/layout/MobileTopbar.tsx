import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/uiStore";
import { useSearchStore } from "../../stores/searchStore";
import { useNavHistoryStore } from "../../stores/navHistoryStore";
import { routeLabel } from "../../lib/routes";
import { ThemeSelect } from "./ThemeSelect";
import { LanguageCombobox } from "./LanguageCombobox";

/**
 * Mobile topbar kept deliberately small so every control fits at 360 px.
 * History arrows reuse the same store as the desktop titlebar; the current
 * route name replaces the logo/title block to avoid crowding.
 */
export function MobileTopbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const entries = useNavHistoryStore((s) => s.entries);
  const index = useNavHistoryStore((s) => s.index);
  const canBack = index > 0;
  const canForward = index >= 0 && index < entries.length - 1;
  const backKey = routeLabel(entries[index - 1]);
  const forwardKey = routeLabel(entries[index + 1]);
  const currentKey = routeLabel(location.pathname);
  const title = currentKey ? t(currentKey) : t("app.name");

  return (
    <div
      className="shrink-0 border-b"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex h-14 items-center gap-0.5 px-1.5">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? t("titlebar.expand_sidebar") : t("titlebar.collapse_sidebar")}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          {collapsed ? <Menu size={21} /> : <X size={21} />}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!canBack}
          aria-label={backKey ? t(backKey) : t("titlebar.back")}
          title={backKey ? t(backKey) : t("titlebar.back")}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)] disabled:opacity-35"
          style={{ color: "var(--text)" }}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={!canForward}
          aria-label={forwardKey ? t(forwardKey) : t("titlebar.forward")}
          title={forwardKey ? t(forwardKey) : t("titlebar.forward")}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)] disabled:opacity-35"
          style={{ color: "var(--text)" }}
        >
          <ChevronRight size={19} />
        </button>
        <span
          className="min-w-0 flex-1 truncate px-0.5 text-center text-[11px] font-semibold"
          style={{ color: "var(--text)" }}
          title={title}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={() => useSearchStore.getState().setOpen(true)}
          aria-label={t("titlebar.search")}
          title={t("titlebar.search")}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          <Search size={19} />
        </button>
        <div className="flex h-10 shrink-0 items-center">
          <ThemeSelect variant="titlebar" compact />
        </div>
        <div className="flex h-10 shrink-0 items-center">
          <LanguageCombobox variant="titlebar" compact />
        </div>
      </div>
    </div>
  );
}
