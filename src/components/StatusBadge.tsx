import type { ProjectStatus } from "../types";

const variants: Record<string, string> = {
  draft: "bg-panel text-fg-secondary border-stroke",
  active: "bg-emerald-900/40 text-emerald-200 border-emerald-700",
  paused: "bg-amber-900/40 text-amber-200 border-amber-700",
  archived: "bg-panel/60 text-fg-muted border-stroke/60",
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        variants[status] ?? "bg-panel text-fg-secondary border-stroke"
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
