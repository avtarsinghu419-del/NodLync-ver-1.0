import { useEffect, useRef, useState } from "react";

interface LogValue {
  completed: string;
  next_steps: string;
  blockers: string;
  notes: string;
}

interface Props {
  onSubmit: (log: LogValue) => Promise<void>;
  busy?: boolean;
  lastSubmitted?: string | null;
  value?: LogValue;
  onChange?: (next: LogValue) => void;
}

const empty: LogValue = {
  completed: "",
  next_steps: "",
  blockers: "",
  notes: "",
};

type LogField = keyof typeof empty;

const NUMBERED_LIST_PATTERN = /^\s*\d+\.\s/;

function hasMeaningfulText(value: string) {
  return value.replace(/^\s*\d+\.\s*/gm, "").trim().length > 0;
}

const WorkLogCard = ({ onSubmit, busy, lastSubmitted, value, onChange }: Props) => {
  const [log, setLog] = useState<LogValue>(value ?? empty);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const nextSelectionRef = useRef<{ key: LogField; position: number } | null>(null);
  const textareaRefs = useRef<Record<LogField, HTMLTextAreaElement | null>>({
    completed: null,
    next_steps: null,
    blockers: null,
    notes: null,
  });

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (!nextSelectionRef.current) return;

    const { key, position } = nextSelectionRef.current;
    const textarea = textareaRefs.current[key];
    if (textarea) {
      textarea.setSelectionRange(position, position);
      textarea.focus();
    }
    nextSelectionRef.current = null;
  }, [log]);

  useEffect(() => {
    if (value) {
      setLog(value);
    }
  }, [value]);

  const setField =
    (key: LogField) => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const incomingValue = event.target.value;
      const previousValue = log[key];
      const shouldAutoStart =
        previousValue.trim().length === 0 &&
        incomingValue.trim().length > 0 &&
        !NUMBERED_LIST_PATTERN.test(incomingValue);

      const nextValue = shouldAutoStart
        ? `1. ${incomingValue.replace(/^\s+/, "")}`
        : incomingValue;

      setLog((prev) => {
        const next = { ...prev, [key]: nextValue };
        onChange?.(next);
        return next;
      });

      if (validationError) setValidationError(null);
      if (submitted) setSubmitted(false);
    };

  const handleNumberedEnter =
    (key: LogField) => (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;

      const textarea = event.currentTarget;
      const value = log[key];
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const beforeSelection = value.slice(0, selectionStart);
      const currentLine = beforeSelection.split("\n").pop() ?? "";

      if (!NUMBERED_LIST_PATTERN.test(currentLine) && !NUMBERED_LIST_PATTERN.test(value)) {
        return;
      }

      event.preventDefault();

      const currentLineMatch = currentLine.match(/^\s*(\d+)\.\s?(.*)$/);
      if (currentLineMatch && currentLineMatch[2].trim().length === 0) {
        const lineStartIndex = selectionStart - currentLine.length;
        const nextValue = value.slice(0, lineStartIndex) + value.slice(selectionEnd);
        setLog((prev) => {
          const next = { ...prev, [key]: nextValue };
          onChange?.(next);
          return next;
        });
        nextSelectionRef.current = {
          key,
          position: Math.max(0, lineStartIndex),
        };
        return;
      }

      const numberedLines = [...beforeSelection.matchAll(/(?:^|\n)\s*(\d+)\.\s/g)];
      const lastNumber = numberedLines.length
        ? Number(numberedLines[numberedLines.length - 1][1])
        : 1;
      const insertion = `\n${lastNumber + 1}. `;
      const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);

      setLog((prev) => {
        const next = { ...prev, [key]: nextValue };
        onChange?.(next);
        return next;
      });
      nextSelectionRef.current = {
        key,
        position: selectionStart + insertion.length,
      };
    };

  const handleSubmit = async () => {
    setValidationError(null);

    if (!hasMeaningfulText(log.completed)) {
      setValidationError("Completed work cannot be empty.");
      return;
    }

    try {
      await onSubmit(log);
      setLog(empty);
      onChange?.(empty);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      setValidationError("Failed to post log. Please try again.");
      console.error("ERROR posting daily log", error);
    }
  };

  const hasBlockers = hasMeaningfulText(log.blockers);

  const renderTextArea = (
    key: LogField,
    label: string,
    placeholder: string,
    options?: {
      emphasized?: boolean;
      emphasizedClassName?: string;
    }
  ) => (
    <label className="block space-y-1.5">
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          options?.emphasized ? options.emphasizedClassName : "text-fg-muted"
        }`}
      >
        {label}
      </span>
      <textarea
        ref={(element) => {
          textareaRefs.current[key] = element;
        }}
        rows={6}
        className={`w-full rounded-xl border bg-surface px-4 py-3.5 text-sm leading-7 text-fg transition placeholder:text-fg-muted focus:outline-none focus:ring-2 resize-y ${
          key === "blockers"
            ? hasBlockers
              ? "min-h-[9.5rem] border-rose-700 bg-rose-900/10 focus:ring-rose-500"
              : "min-h-[9.5rem] border-stroke focus:ring-primary"
            : "min-h-[10.75rem] border-stroke focus:ring-primary"
        }`}
        placeholder={placeholder}
        value={log[key]}
        onChange={setField(key)}
        onKeyDown={handleNumberedEnter(key)}
      />
    </label>
  );

  return (
    <div className="glass-panel p-6 sm:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">Log</span>
          <h3 className="font-semibold text-fg-secondary">Today's Work Log</h3>
        </div>
        <span className="text-xs text-fg-muted">{today}</span>
      </div>

      {lastSubmitted && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 px-3 py-1.5 text-xs text-emerald-400">
          Last log posted at{" "}
          {new Date(lastSubmitted).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {renderTextArea("completed", "Completed Work", "1. What did you finish today?")}
        {renderTextArea("next_steps", "Next Steps", "1. What's on the list for tomorrow?")}
        {renderTextArea("blockers", `Blockers${hasBlockers ? " Warning" : ""}`, "1. Any issues holding you back?", {
          emphasized: true,
          emphasizedClassName: hasBlockers ? "text-rose-400" : "text-fg-muted",
        })}
        {renderTextArea("notes", "Notes / Misc", "1. Additional thoughts...")}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="space-y-1">
          <div className="text-xs text-fg-muted">
            Logs are saved per project and visible in the Overview history.
          </div>
          <div className="text-[11px] text-fg-muted">
            Numbered lists start automatically. Press Enter for the next item.
          </div>
        </div>
        <div className="flex items-center gap-3">
          {validationError && (
            <span className="rounded bg-rose-900/20 px-2 py-1 text-xs text-rose-400">
              {validationError}
            </span>
          )}
          {submitted && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span>OK</span> Log posted!
            </span>
          )}
          <button
            className="btn-primary px-6 py-2.5 text-sm"
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? "Posting..." : "Post Daily Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkLogCard;
