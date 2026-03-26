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
      <div className="glass-panel flex w-full max-w-4xl max-h-[85vh] flex-col border border-stroke shadow-2xl">
        <div className="flex items-center justify-between border-b border-stroke bg-panel/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              {"📋"}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-fg">Today's Work Summary</h2>
          </div>
          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition duration-200 ${
                  copied
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "btn-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {copied ? (
                  <>
                    <span>{"✓"}</span> Copied
                  </>
                ) : (
                  <>
                    <span>{"⎘"}</span> Copy All
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-ghost rounded-lg px-4 py-2 text-sm transition-colors hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-panel/40 p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <InlineSpinner />
              <p className="text-sm text-fg-muted animate-pulse">Aggregating logs across projects...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="mb-4 text-3xl">{"⚠️"}</div>
              <p className="mb-1 font-medium text-rose-400">Failed to load logs</p>
              <p className="text-sm text-fg-muted">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 opacity-60">
              <div className="text-4xl">{"📭"}</div>
              <p className="font-medium text-fg-muted">No updates found for today</p>
              <p className="max-w-xs text-center text-sm text-fg-muted">
                Log some work in your project modules to see them here.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="overflow-x-hidden rounded-xl border border-stroke/50 bg-black/40 p-8 text-[13px] leading-relaxed text-fg-secondary shadow-inner">
                <GeneratedText text={readableText} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stroke/50 bg-panel/30 px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">
            Daily Report Generator
          </p>
          <p className="font-mono text-[10px] text-fg-muted">
            {logs.length} entries found
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryModal;
