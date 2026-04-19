import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchTextInput({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search
        size={14}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
        style={{ color: "var(--text-dim)" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-7 pr-7"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-[var(--bg-elev-strong)]"
          aria-label="Clear"
          style={{ color: "var(--text-dim)" }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
