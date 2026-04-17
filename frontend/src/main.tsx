import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import "./i18n";
import "./styles.css";
import { router } from "./router";
import { ThemeProvider } from "./components/layout/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const remove = () => {
    splash.classList.add("fade-out");
    setTimeout(() => splash.remove(), 400);
  };
  const img = splash.querySelector("img") as HTMLImageElement | null;
  if (!img || img.complete) {
    remove();
    return;
  }
  img.addEventListener("load", remove, { once: true });
  img.addEventListener("error", remove, { once: true });
  setTimeout(remove, 1500);
});
