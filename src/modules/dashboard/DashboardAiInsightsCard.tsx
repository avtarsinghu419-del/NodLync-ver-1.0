import { useNavigate } from "react-router-dom";

export default function DashboardAiInsightsCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-fg-muted uppercase tracking-widest font-bold">AI INSIGHTS</p>
          <h3 className="text-lg font-semibold text-fg mt-2">Your next best actions</h3>
        </div>
        <div className="w-9 h-9 rounded-lg border border-stroke/60 bg-panel/10 flex items-center justify-center">
          ✨
        </div>
      </div>

      <div className="rounded-xl border border-stroke/60 bg-panel/10 p-4 text-sm text-fg-secondary leading-relaxed">
        <p className="text-emerald-200/90 font-medium">
          Based on your milestones and deadlines, we predict the highest-risk items.
        </p>
        <p className="mt-2 text-fg-muted">
          Generate an urgency summary and suggested next steps for today.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary w-full bg-emerald-400 hover:brightness-105"
        onClick={() => navigate("/ai-playground")}
      >
        Generate Report
      </button>
    </div>
  );
}

