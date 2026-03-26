import type { ReactNode } from "react";

export type MetricColor = "primary" | "emerald" | "amber" | "rose" | "slate";

const colorStyles: Record<MetricColor, { value: string; accent: string }> = {
  primary: { value: "text-primary", accent: "border-primary/15 bg-primary/5" },
  emerald: { value: "text-emerald-300", accent: "border-emerald-500/15 bg-emerald-500/5" },
  amber: { value: "text-amber-300", accent: "border-amber-500/15 bg-amber-500/5" },
  rose: { value: "text-rose-300", accent: "border-rose-500/15 bg-rose-500/5" },
  slate: { value: "text-fg-secondary", accent: "border-stroke/60 bg-surface/40" },
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: MetricColor;
  onClick?: () => void;
  meta?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  color = "primary",
  onClick,
  meta,
}: MetricCardProps) {
  const palette = colorStyles[color];

  return (
    <div
      className={`glass-panel rounded-2xl p-6 sm:p-7 transition-colors ${
        onClick ? "cursor-pointer hover:border-primary/40" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${palette.accent}`}>
            <span className="text-lg leading-none">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-muted">
              {title}
            </p>
          </div>
        </div>

        {meta ? (
          <span className="shrink-0 rounded-full border border-stroke/60 bg-surface/40 px-2.5 py-1 text-xs text-fg-muted">
            {meta}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className={`text-[2.5rem] font-extrabold leading-none tracking-tight ${palette.value}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
