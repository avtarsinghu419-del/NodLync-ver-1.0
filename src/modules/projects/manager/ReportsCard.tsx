import { useState } from "react";
import GeneratedText from "../../../components/GeneratedText";
import type { Project } from "../../../types";
import { formatDateTime } from "../../../utils/format";
import { normalizeGeneratedText } from "../../../utils/generatedText";

interface Props {
  project: Project;
  onGenerateReport: (type: "today" | "full") => Promise<string>;
}

const ReportsCard = ({ project, onGenerateReport }: Props) => {
  const [generating, setGenerating] = useState<"today" | "full" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleGenerate = async (type: "today" | "full") => {
    setGenerating(type);
    const content = await onGenerateReport(type);
    setPreview(content);
    setGenerating(null);
  };

  const handleExport = () => {
    if (!preview) return;
    const blob = new Blob([normalizeGeneratedText(preview)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📄</span>
        <h3 className="text-sm font-semibold text-fg-secondary">Quick Reports</h3>
      </div>

      <div className="space-y-2">
        <button
          className="w-full min-w-0 flex items-center justify-between gap-3 rounded-lg border border-stroke px-3 py-2.5 transition hover:border-primary/50 hover:bg-surface/50 group"
          onClick={() => handleGenerate("today")}
          disabled={!!generating}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
              <span className="text-xs">🗓️</span>
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-fg-secondary transition group-hover:text-primary">
                Today's Report
              </p>
              <p className="truncate text-xs text-fg-muted">Daily work log summary</p>
            </div>
          </div>
          {generating === "today" ? (
            <span className="shrink-0 whitespace-nowrap text-xs text-fg-muted animate-pulse">
              Generating...
            </span>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-fg-muted transition group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        <button
          className="w-full min-w-0 flex items-center justify-between gap-3 rounded-lg border border-stroke px-3 py-2.5 transition hover:border-primary/50 hover:bg-surface/50 group"
          onClick={() => handleGenerate("full")}
          disabled={!!generating}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/10">
              <span className="text-xs">📊</span>
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-fg-secondary transition group-hover:text-accent">
                Full Project Report
              </p>
              <p className="truncate text-xs text-fg-muted">Complete project overview</p>
            </div>
          </div>
          {generating === "full" ? (
            <span className="shrink-0 whitespace-nowrap text-xs text-fg-muted animate-pulse">
              Generating...
            </span>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-fg-muted transition group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {preview ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Preview</p>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-stroke bg-surface p-3">
            <GeneratedText
              text={normalizeGeneratedText(preview)}
              className="text-xs leading-relaxed text-fg-secondary"
            />
          </div>
          <button
            className="btn-ghost flex w-full items-center justify-center gap-1.5 text-sm"
            onClick={handleExport}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export as TXT
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stroke p-4 text-center">
          <p className="text-xs text-fg-muted">Select a report type above to preview</p>
        </div>
      )}

      <p className="text-center text-[10px] text-fg-muted">
        Generated: {formatDateTime(project.created_at ?? "")}
      </p>
    </div>
  );
};

export default ReportsCard;
