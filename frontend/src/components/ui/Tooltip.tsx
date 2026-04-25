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
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [effectivePlacement, setEffectivePlacement] = useState<"top" | "bottom">(placement);

  // Phase 1: compute position from trigger bounds
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const shouldFlip = placement === "top" && rect.top < 96;
    const eff: "top" | "bottom" = shouldFlip ? "bottom" : placement;
    const top = eff === "top" ? rect.top - 8 : rect.bottom + 8;
    const left = rect.left + rect.width / 2;
    setEffectivePlacement(eff);
    setCoords({ top, left });

    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, placement]);

  // Phase 2: after tooltip renders, clamp its left edge within the viewport.
  // The tooltip is centered on `left` via -translate-x-1/2, so we measure the
  // actual rendered rect and shift the center point to keep it on-screen.
  useLayoutEffect(() => {
    if (!open || !coords || !tooltipRef.current) return;
    const box = tooltipRef.current.getBoundingClientRect();
    const margin = 8;
    let newLeft = coords.left;
    if (box.left < margin) {
      newLeft = coords.left + (margin - box.left);
    } else if (box.right > window.innerWidth - margin) {
      newLeft = coords.left - (box.right - (window.innerWidth - margin));
    }
    if (newLeft !== coords.left) {
      setCoords((prev) => (prev ? { ...prev, left: newLeft } : null));
    }
  }, [open, coords]);

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
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[60] w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-md border px-2 py-1 text-[11px] leading-snug shadow-lg",
              effectivePlacement === "top" ? "-translate-y-full" : "",
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
