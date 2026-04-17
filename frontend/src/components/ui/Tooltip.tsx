import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  placement?: "top" | "bottom";
}

export function Tooltip({
  content,
  children,
  className,
  placement = "top",
}: Props) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = placement === "top" ? rect.top - 8 : rect.bottom + 8;
    const left = rect.left + rect.width / 2;
    setCoords({ top, left });

    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, placement]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[60] w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-md border px-2 py-1 text-[11px] leading-snug shadow-lg",
              placement === "top" ? "-translate-y-full" : "",
            )}
            style={{
              top: coords.top,
              left: coords.left,
              backgroundColor: "var(--bg-elev-strong)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
