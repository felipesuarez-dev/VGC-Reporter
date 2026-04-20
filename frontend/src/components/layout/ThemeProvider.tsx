import { useEffect } from "react";
import { useUiStore, type Theme } from "../../stores/uiStore";

const CONCRETE_CLASSES = [
  "theme-gengar",
  "theme-clefable",
  "theme-incineroar",
  "theme-tyranitar",
  "theme-milotic",
];

function resolveTheme(theme: Theme, prefersDark: boolean): string {
  if (theme === "system") return prefersDark ? "theme-gengar" : "theme-clefable";
  return `theme-${theme}`;
}

function applyClass(cls: string) {
  const root = document.documentElement;
  root.classList.remove(...CONCRETE_CLASSES);
  root.classList.add(cls);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyClass(resolveTheme(theme, media.matches));
    if (theme !== "system") return;
    const onChange = (e: MediaQueryListEvent) => {
      applyClass(resolveTheme("system", e.matches));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);
  return <>{children}</>;
}
