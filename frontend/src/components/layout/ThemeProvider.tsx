import { useEffect } from "react";
import { useUiStore } from "../../stores/uiStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-gengar", "theme-clefable");
    root.classList.add(`theme-${theme}`);
  }, [theme]);
  return <>{children}</>;
}
