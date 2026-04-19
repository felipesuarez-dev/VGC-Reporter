import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

const TITLE = "VGC Reportes";

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        const initial = await w.isMaximized();
        if (!cancelled) setMaximized(initial);
        const off = await w.onResized(async () => {
          const m = await w.isMaximized();
          if (!cancelled) setMaximized(m);
        });
        unlisten = off;
      } catch {
        /* not running in Tauri (e.g. pure Vite preview) */
      }
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  const minimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      /* no-op outside Tauri */
    }
  };

  const toggleMax = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
    } catch {
      /* no-op outside Tauri */
    }
  };

  const close = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      /* no-op outside Tauri */
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 shrink-0 select-none items-center justify-between border-b"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 text-xs font-medium"
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="h-4 w-4 rounded-full"
          draggable={false}
        />
        <span data-tauri-drag-region>{TITLE}</span>
      </div>
      <div className="flex h-full items-stretch">
        <button
          type="button"
          onClick={minimize}
          aria-label="Minimize"
          title="Minimize"
          className="flex h-full w-11 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={toggleMax}
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
          className="flex h-full w-11 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          title="Close"
          className="group flex h-full w-11 items-center justify-center hover:bg-red-600"
          style={{ color: "var(--text)" }}
        >
          <X size={14} className="group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
