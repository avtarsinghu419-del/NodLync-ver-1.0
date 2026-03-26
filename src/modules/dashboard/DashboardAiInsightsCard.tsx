import { useNavigate } from "react-router-dom";

export default function DashboardAiInsightsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">AI INSIGHTS</p>
          <h3 className="mt-2 text-lg font-semibold text-fg text-wrap-balance">Your next best actions</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke/60 bg-panel/10">
          ✨
        </div>
      </div>

      <div className="rounded-2xl border border-stroke/60 bg-panel/10 p-4 text-sm leading-relaxed text-fg-secondary">
        <p className="ai-highlight font-medium">
          Based on your milestones and deadlines, we predict the highest-risk items.
        </p>
        <p className="mt-2 overflow-anywhere text-fg-muted">
          Generate an urgency summary and suggested next steps for today.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary w-full bg-emerald-400 hover:brightness-105"
        onClick={() => navigate("/ai-playground")}
      >
        Try now
      </button>
    </div>
  );
}
