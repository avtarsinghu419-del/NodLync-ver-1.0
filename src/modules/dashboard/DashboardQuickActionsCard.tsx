import { useNavigate } from "react-router-dom";

export default function DashboardQuickActionsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">Quick Actions</p>
          <h3 className="mt-2 text-sm font-semibold text-fg-secondary text-wrap-balance">Boost productivity</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke/60 bg-panel/10">
          ⚡
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-2xl border border-stroke/60 bg-panel/10 p-3 text-left transition hover:bg-surface/30"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">➕</div>
          <div className="text-sm font-semibold text-fg">New Project</div>
          <div className="text-xs text-fg-muted">Create & manage</div>
        </button>
        <button
          type="button"
          className="rounded-2xl border border-stroke/60 bg-panel/10 p-3 text-left transition hover:bg-surface/30"
          onClick={() => navigate("/meetings")}
        >
          <div className="text-base">🗓️</div>
          <div className="text-sm font-semibold text-fg">Add Meeting</div>
          <div className="text-xs text-fg-muted">Schedule & track</div>
        </button>
        <button
          type="button"
          className="rounded-2xl border border-stroke/60 bg-panel/10 p-3 text-left transition hover:bg-surface/30"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">📌</div>
          <div className="text-sm font-semibold text-fg">Add Task</div>
          <div className="text-xs text-fg-muted">Through a milestone</div>
        </button>
        <button
          type="button"
          className="rounded-2xl border border-stroke/60 bg-panel/10 p-3 text-left transition hover:bg-surface/30"
          onClick={() => navigate("/workflows")}
        >
          <div className="text-base">🔁</div>
          <div className="text-sm font-semibold text-fg">Add Update</div>
          <div className="text-xs text-fg-muted">Automate workflows</div>
        </button>
      </div>
    </div>
  );
}
