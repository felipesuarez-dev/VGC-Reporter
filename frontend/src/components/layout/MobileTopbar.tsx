import { Menu, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/uiStore";
import { useSearchStore } from "../../stores/searchStore";
import { ThemeSelect } from "./ThemeSelect";
import { LanguageToggle } from "./LanguageToggle";

export function MobileTopbar() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div
      className="shrink-0 flex flex-col border-b"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex h-14 items-center gap-0.5 px-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? t("titlebar.expand_sidebar") : t("titlebar.collapse_sidebar")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          {collapsed ? <Menu size={22} /> : <X size={22} />}
        </button>

        <img
          src="/logo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-7 w-7 shrink-0 rounded-full object-cover ml-1"
        />
        <span className="ml-2 flex-1 truncate text-sm font-bold tracking-tight">
          VGC Reporter
        </span>

        <button
          type="button"
          onClick={() => useSearchStore.getState().setOpen(true)}
          aria-label={t("titlebar.search")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          <Search size={20} />
        </button>

        <div className="flex h-11 shrink-0 items-center">
          <ThemeSelect variant="titlebar" />
        </div>
        <div className="flex h-11 shrink-0 items-center px-1">
          <LanguageToggle variant="titlebar" />
        </div>
      </div>
    </div>
  );
}
