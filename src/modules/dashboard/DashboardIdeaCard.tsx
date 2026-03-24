import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DAILY_IDEAS = [
  { title: "Automated Meeting Notes", description: "Use Whisper to transcribe and LLM to summarize daily standups into NodLync tasks." },
  { title: "Smart Bug Triage", description: "An AI agent that reads incoming bug reports and auto-assigns tags and priority." },
  { title: "Onboarding Chatbot", description: "A system that reads documentation and answers new employee queries." },
  { title: "GitHub PR Reviewer", description: "Combine diff parsing with AI to leave code review comments automatically." },
  { title: "Personal CRM", description: "Keep track of contacts and let AI draft follow-up emails using your specific tone." },
  { title: "API Endpoint Generator", description: "Describe a data model and get the fully typed Express router + tests generated." },
  { title: "Competitor Analysis Tool", description: "Scrape pricing pages and summarize differences using a reasoning model." }
];

export default function DashboardIdeaCard() {
  const navigate = useNavigate();
  
  const todayIdea = useMemo(() => {
    // Determine 'day' using a stable method across sessions for 24 hours.
    // UTC Midnight is safe.
    const now = new Date();
    const hash = now.getUTCFullYear() * 10000 + now.getUTCMonth() * 100 + now.getUTCDate();
    return DAILY_IDEAS[hash % DAILY_IDEAS.length];
  }, []);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">💡</span>
        <h3 className="font-semibold text-fg-secondary text-sm">Idea of the Day</h3>
      </div>
      
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h4 className="font-bold text-fg text-sm mb-1">{todayIdea.title}</h4>
        <p className="text-xs text-fg-muted leading-relaxed">{todayIdea.description}</p>
      </div>

      <button
        onClick={() => navigate("/ai-playground")}
        className="w-full btn-ghost py-2 text-xs font-bold"
      >
        Generate Custom Ideas ✨
      </button>
    </div>
  );
}
