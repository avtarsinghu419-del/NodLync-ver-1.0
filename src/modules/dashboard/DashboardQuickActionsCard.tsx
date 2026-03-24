import { useNavigate } from "react-router-dom";

export default function DashboardQuickActionsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-fg-muted uppercase tracking-widest font-bold">Quick Actions</p>
          <h3 className="text-sm font-semibold text-fg-secondary mt-2">Boost productivity</h3>
        </div>
        <div className="w-9 h-9 rounded-lg border border-stroke/60 bg-panel/10 flex items-center justify-center">
          ⚡
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-xl border border-stroke/60 bg-panel/10 p-3 text-left hover:bg-surface/30 transition"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">➕</div>
          <div className="text-sm font-semibold text-fg">New Project</div>
          <div className="text-xs text-fg-muted">Create & manage</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-stroke/60 bg-panel/10 p-3 text-left hover:bg-surface/30 transition"
          onClick={() => navigate("/meetings")}
        >
          <div className="text-base">🗓️</div>
          <div className="text-sm font-semibold text-fg">Add Meeting</div>
          <div className="text-xs text-fg-muted">Schedule & track</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-stroke/60 bg-panel/10 p-3 text-left hover:bg-surface/30 transition"
          onClick={() => navigate("/projects")}
        >
          <div className="text-base">📌</div>
          <div className="text-sm font-semibold text-fg">Add Task</div>
          <div className="text-xs text-fg-muted">Through a milestone</div>
        </button>
        <button
          type="button"
          className="rounded-xl border border-stroke/60 bg-panel/10 p-3 text-left hover:bg-surface/30 transition"
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

