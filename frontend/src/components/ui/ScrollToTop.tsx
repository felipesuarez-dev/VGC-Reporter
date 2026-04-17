import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

const SCROLL_CONTAINER_ID = "app-main";
const VISIBILITY_THRESHOLD_PX = 300;

export function ScrollToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(SCROLL_CONTAINER_ID);
    if (!el) return;
    const update = () => setVisible(el.scrollTop > VISIBILITY_THRESHOLD_PX);
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  const onClick = () => {
    const el = document.getElementById(SCROLL_CONTAINER_ID);
    el?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label={t("common.scroll_to_top")}
      title={t("common.scroll_to_top")}
      onClick={onClick}
      className={cn(
        "fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all",
        visible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      style={{
        backgroundColor: "var(--bg-elev-strong)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
