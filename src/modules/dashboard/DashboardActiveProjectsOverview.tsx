import type { Project } from "../../types";

export type ActiveProjectRow = {
  project: Project;
  progress: number; // 0-100
  stateLabel: "ACTIVE" | "DELAYED";
  doneCount: number;
  totalCount: number;
  description?: string;
};

export default function DashboardActiveProjectsOverview({
  rows,
  onViewAll,
}: {
  rows: ActiveProjectRow[];
  onViewAll?: () => void;
}) {
  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">📌</span>
          <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">Active Projects Overview</h3>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={onViewAll}
          disabled={!onViewAll}
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stroke/60 p-6 text-sm text-fg-muted">
            No active project stats yet.
          </div>
        ) : (
          rows.slice(0, 3).map((r) => {
            const isDelayed = r.stateLabel === "DELAYED";
            return (
              <div
                key={r.project.id}
                className="rounded-2xl border border-stroke/60 bg-panel/10 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stroke/60 bg-surface/60 text-sm">
                        {r.project.name.trim().slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{r.project.name}</p>
                        <p className="line-clamp-2 text-xs text-fg-muted">
                          {r.project.description || r.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                      isDelayed
                        ? "text-rose-200 bg-rose-900/30 border-rose-700/50"
                        : "text-emerald-200 bg-emerald-900/35 border-emerald-700/50"
                    }`}
                  >
                    {r.stateLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fg-muted">Progress</span>
                    <span className="text-xs text-fg-muted font-mono">{r.progress}%</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-700 ${
                        isDelayed ? "bg-rose-400" : "bg-primary"
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, r.progress))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

