import { useEffect, useState } from "react";
import { getDailyLogsAcrossProjects, type ProjectLog } from "../../api/logsApi";
import InlineSpinner from "../../components/InlineSpinner";

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
      report += `PROJECT: ${projectName}\n\n`;

      report += `# Completed Work\n\n`;
      projectLogs.forEach((l) => {
        if (l.completed_work?.trim()) {
          report += l.completed_work
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => `* ${line}`)
            .join("\n") + "\n";
        }
      });

      report += `\n# Next Steps\n\n`;
      projectLogs.forEach((l) => {
        if (l.next_steps?.trim()) {
          report += l.next_steps
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => `* ${line}`)
            .join("\n") + "\n";
        }
      });

      report += `\n# Blockers\n\n`;
      const blockersFound = projectLogs.some(l => l.blockers?.trim());
      if (blockersFound) {
          projectLogs.forEach((l) => {
            if (l.blockers?.trim()) {
              report += l.blockers
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => `* ${line}`)
                .join("\n") + "\n";
            }
          });
      } else {
          report += `* None\n`;
      }

      if (projectLogs.some((l) => l.notes?.trim())) {
        report += `\n# Notes\n\n`;
        projectLogs.forEach((l) => {
          if (l.notes?.trim()) {
            report += l.notes
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => `* ${line}`)
              .join("\n") + "\n";
          }
        });
      }

      report += `\n---\n\n`;
    });

    return report.trim();
  };

  const fullText = generateReportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl flex flex-col max-h-[85vh] border shadow-2xl border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              📋
            </div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Today's Work Summary</h2>
          </div>
          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <button
                onClick={handleCopy}
                className={`transition-all duration-200 px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${
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
              className="btn-ghost text-sm px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 bg-slate-950/40 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <InlineSpinner />
              <p className="text-slate-500 text-sm animate-pulse">Aggregating logs across projects...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-4">⚠️</div>
              <p className="text-rose-400 font-medium mb-1">Failed to load logs</p>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
              <div className="text-4xl">📭</div>
              <p className="text-slate-400 font-medium">No updates found for today</p>
              <p className="text-slate-600 text-sm max-w-xs text-center">
                Log some work in your project modules to see them here.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-[13px] text-slate-300 leading-relaxed bg-black/40 p-8 rounded-xl border border-slate-800/50 shadow-inner overflow-x-hidden">
                {fullText}
              </pre>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/30 flex justify-between items-center px-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Daily Report Generator
            </p>
            <p className="text-[10px] text-slate-600 font-mono">
                {logs.length} entries found
            </p>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryModal;
