import { useNavigate } from "react-router-dom";

export default function DashboardResearchCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔬</span>
        <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">Research Hub</h3>
      </div>
      <p className="overflow-anywhere text-xs leading-relaxed text-fg-muted">
        Compare AI models side-by-side or synthesize an ultimate summary.
      </p>
      <button
        type="button"
        onClick={() => navigate("/ai-playground")}
        className="btn-primary w-full py-2 text-xs font-bold"
      >
        Open AI Playground
      </button>
    </div>
  );
}
