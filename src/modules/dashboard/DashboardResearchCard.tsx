import { useNavigate } from "react-router-dom";

export default function DashboardResearchCard() {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔬</span>
        <h3 className="font-semibold text-slate-200 text-sm">Research Hub</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Compare AI models side-by-side or synthesize an ultimate summary.
      </p>
      <button
        onClick={() => navigate("/ai-playground")}
        className="w-full btn-primary py-2 text-xs font-bold"
      >
        Open AI Playground
      </button>
    </div>
  );
}
