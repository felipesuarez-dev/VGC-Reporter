import type { ReactNode } from "react";
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
  return (
    <span className={cn("group relative inline-block", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 whitespace-normal rounded-md border px-2 py-1 text-[11px] leading-snug opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
        style={{
          backgroundColor: "var(--bg-elev-strong)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {content}
      </span>
    </span>
  );
}
