import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface CollapsibleCardProps {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleCard({ title, icon: Icon, defaultOpen = false, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card p-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <h3 className="text-base font-semibold flex items-center gap-2.5" style={{ color: "var(--color-text)" }}>
          {Icon && (
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-accent-muted)" }}
            >
              <Icon size={15} style={{ color: "var(--color-accent)" }} />
            </span>
          )}
          {title}
        </h3>
        <ChevronDown
          size={18}
          className="transition-transform duration-200 flex-shrink-0"
          style={{ color: "var(--color-text-muted)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && <div className="mt-5">{children}</div>}
    </div>
  );
}
