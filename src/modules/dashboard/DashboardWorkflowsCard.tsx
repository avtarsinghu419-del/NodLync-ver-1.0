import type { WorkflowsRow } from "../../api/workflowsApi";

export default function DashboardWorkflowsCard({
  workflows,
  title = "Workflows",
  viewAllLabel = "View All",
}: {
  workflows: WorkflowsRow[];
  title?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">⚙️</span>
          <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">{title}</h3>
        </div>
        <button type="button" className="btn-ghost shrink-0 text-xs" disabled>
          {viewAllLabel}
        </button>
      </div>

      <div className="space-y-3">
        {workflows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stroke/60 p-6 text-sm text-fg-muted">
            No workflows found. Create one in the Workflows section.
          </div>
        ) : (
          workflows.slice(0, 4).map((w) => (
            <div
              key={w.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-stroke/60 bg-panel/10 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{w.name}</p>
                <p className="overflow-anywhere text-xs text-fg-muted">
                  {w.parent_id ? "Folder" : "Root"} • {new Date(w.created_at).toLocaleDateString("en-US")}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-700/60 bg-emerald-900/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                ACTIVE
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
