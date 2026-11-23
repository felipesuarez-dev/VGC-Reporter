import type { ReactNode } from "react";

export function SectionTitle({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {hint}
        </p>
      </div>
    </div>
  );
}
