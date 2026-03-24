import { useEffect, useState } from "react";
import { getDailyLogsAcrossProjects, type ProjectLog } from "../../api/logsApi";
import GeneratedText from "../../components/GeneratedText";
import InlineSpinner from "../../components/InlineSpinner";
import { normalizeGeneratedText } from "../../utils/generatedText";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type LogWithProject = ProjectLog & { projects: { name: string } };

const DailySummaryModal = ({ isOpen, onClose, userId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogWithProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const load = async () => {
        setLoading(true);
        setError(null);
        setCopied(false);
        const { data, error } = await getDailyLogsAcrossProjects(userId);
        if (error) {
          setError(error.message);
        } else {
          setLogs((data as LogWithProject[]) || []);
        }
        setLoading(false);
      };
      load();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const cleanLine = (line: string) =>
    line.replace(/^\s*[*-]\s*/, "").replace(/^\s*\d+\.\s*/, "").trim();

  const collectSectionLines = (
    items: LogWithProject[],
    field: "completed_work" | "next_steps" | "blockers" | "notes"
  ) => {
    const lines: string[] = [];
    items.forEach((log) => {
      const raw = (log as any)[field] as string | undefined;
      if (!raw) return;
      raw
        .split("\n")
        .map(cleanLine)
        .filter(Boolean)
        .forEach((line) => lines.push(line));
    });
    return lines;
  };

  const formatNumbered = (lines: string[]) =>
    lines.length === 0 ? "None" : lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n");

  const generateReportText = () => {
    if (logs.length === 0) return "No updates found for today";

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const groups: Record<string, LogWithProject[]> = {};
    logs.forEach((log) => {
      const name = log.projects?.name || "Unknown Project";
      if (!groups[name]) groups[name] = [];
      groups[name].push(log);
    });

    let report = `DATE: ${today}\n\n---\n\n`;

    Object.entries(groups).forEach(([projectName, projectLogs]) => {
      const completed = collectSectionLines(projectLogs, "completed_work");
      const next = collectSectionLines(projectLogs, "next_steps");
      const blockers = collectSectionLines(projectLogs, "blockers");
      const notes = collectSectionLines(projectLogs, "notes");

      report += `PROJECT: ${projectName}\n\n`;
      report += `# Completed Work\n${formatNumbered(completed)}\n\n`;
      report += `# Next Steps\n${formatNumbered(next)}\n\n`;
      report += `# Blockers\n${formatNumbered(blockers)}\n\n`;
      if (notes.length > 0) {
        report += `# Notes\n${formatNumbered(notes)}\n\n`;
      }
      report += `---\n\n`;
    });

    return report.trim();
  };

  const fullText = generateReportText();
  const readableText = normalizeGeneratedText(fullText);

  const handleCopy = () => {
    navigator.clipboard.writeText(readableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-panel/80 px-4 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl flex flex-col max-h-[85vh] border shadow-2xl border-stroke">
        <div className="p-5 border-b border-stroke flex items-center justify-between bg-panel/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              📋
            </div>
            <h2 className="text-lg font-bold text-fg tracking-tight">Today's Work Summary</h2>
          </div>
          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <button
                onClick={handleCopy}
                className={`transition duration-200 px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${
                  copied
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "btn-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {copied ? (
                  <>
                    <span>✓</span> Copied
                  </>
                ) : (
                  <>
                    <span>⎘</span> Copy All
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-ghost text-sm px-4 py-2 hover:bg-surface rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 bg-panel/40 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <InlineSpinner />
              <p className="text-fg-muted text-sm animate-pulse">Aggregating logs across projects...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-4">⚠️</div>
              <p className="text-rose-400 font-medium mb-1">Failed to load logs</p>
              <p className="text-fg-muted text-sm">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
              <div className="text-4xl">📭</div>
              <p className="text-fg-muted font-medium">No updates found for today</p>
              <p className="text-fg-muted text-sm max-w-xs text-center">
                Log some work in your project modules to see them here.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-[13px] text-fg-secondary leading-relaxed bg-black/40 p-8 rounded-xl border border-stroke/50 shadow-inner overflow-x-hidden">
                <GeneratedText text={readableText} />
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-stroke/50 bg-panel/30 flex justify-between items-center px-6">
            <p className="text-[10px] text-fg-muted uppercase tracking-widest font-bold">
                Daily Report Generator
            </p>
            <p className="text-[10px] text-fg-muted font-mono">
                {logs.length} entries found
            </p>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryModal;
