import { useEffect, useState } from "react";
import type { Milestone } from "../../../api/milestonesApi";
import BulkDeleteBar from "../../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../../components/IndeterminateCheckbox";
import PaginationControls from "../../../components/PaginationControls";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { usePagination } from "../../../hooks/usePagination";

interface Props {
  milestones: Milestone[];
  projectId: string;
  userId: string;
  onAdd: (payload: { title: string; deadline?: string | null }) => Promise<void>;
  onToggle: (milestone: Milestone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  busy?: boolean;
}

const MilestonesCard = ({ milestones, projectId, userId, onAdd, onToggle, onDelete, onBulkDelete, busy }: Props) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [deadline, setDeadline] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const storageKey = `project-manager:milestones:${projectId}:${userId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setInput(parsed.input ?? "");
      setDeadline(parsed.deadline ?? "");
      setAdding(Boolean(parsed.adding));
    } catch {
      // ignore malformed draft
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          input,
          deadline,
          adding,
        })
      );
    } catch {
      // ignore storage failures
    }
  }, [storageKey, input, deadline, adding]);

  const formatDeadline = (d: string | null | undefined) => {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const pagination = usePagination(milestones);
  const selection = useBulkSelection(milestones, (m) => m.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await onAdd({
      title: input.trim(),
      deadline: deadline ? deadline : null,
    });
    setInput("");
    setDeadline("");
    setAdding(false);
    localStorage.removeItem(storageKey);
  };

  const handleToggle = async (m: Milestone) => {
    setSavingId(m.id);
    await onToggle(m);
    setSavingId(null);
  };

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${selection.selectedCount} selected milestone(s)?`)) return;
    setBulkDeleting(true);
    await onBulkDelete(Array.from(selection.selectedIds));
    selection.clearSelection();
    setBulkDeleting(false);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base text-primary">🚩</span>
          <h3 className="font-semibold text-fg-secondary text-sm">Milestones</h3>
        </div>
        <div className="flex items-center gap-2">
          {milestones.length > 0 && (
            <span className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">{completedCount}/{milestones.length} Done</span>
          )}
          <button className="text-xs text-primary hover:text-primary/80 transition font-bold" onClick={() => setAdding((v) => !v)}>
            {adding ? "CANCEL" : "+ ADD"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-stroke bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-fg-muted"
            placeholder="Enter milestone name..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <input
            type="date"
            className="w-36 rounded-lg border border-stroke bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-fg-muted"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Milestone deadline"
          />
          <button className="btn-primary text-xs px-4" onClick={handleAdd} disabled={busy || !input.trim()}>
            ADD
          </button>
        </div>
      )}

      <BulkDeleteBar
        count={selection.selectedCount}
        label="milestones"
        onDelete={handleBulkDelete}
        onClear={selection.clearSelection}
        busy={bulkDeleting}
      />

      {milestones.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-stroke rounded-2xl bg-panel/10">
           <span className="text-3xl opacity-20">🎯</span>
           <div className="space-y-1">
              <p className="text-sm font-semibold text-fg-muted">No Milestones Found</p>
              <p className="text-xs text-fg-muted">Break down your project into strategic goals.</p>
           </div>
           {!adding && (
              <button 
                onClick={() => setAdding(true)}
                className="btn-primary text-xs py-2 px-6"
              >
                 Create your first milestone
              </button>
           )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-fg-muted px-1">
            <IndeterminateCheckbox
              checked={pageState.checked}
              indeterminate={pageState.indeterminate}
              onChange={() => selection.togglePage(pagination.paginatedItems)}
              ariaLabel="Select all visible milestones"
            />
            <span>Select All Visible</span>
          </div>
          <ul className="space-y-1">
            {pagination.paginatedItems.map((m) => {
              const isCompleted = m.status === "completed";
              const isLoading = savingId === m.id;
              return (
                <li key={m.id} className="flex items-center gap-3 group rounded-lg px-2 py-2 hover:bg-surface/30 transition border border-transparent hover:border-stroke/50">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(m.id)}
                    onChange={() => selection.toggleOne(m.id)}
                    className="h-3.5 w-3.5 accent-primary rounded bg-panel border-stroke"
                  />
                  <span className={`flex-1 text-sm leading-snug font-medium ${isCompleted ? "line-through text-fg-muted" : "text-fg-secondary"}`}>
                    {m.title}
                  </span>
                  {m.deadline && (
                    <span className="text-[10px] text-fg-muted font-mono opacity-80">
                      Due {formatDeadline(m.deadline)}
                    </span>
                  )}
                  <button 
                    className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-rose-500 transition p-1" 
                    onClick={() => onDelete(m.id)} 
                    title="Delete Milestone"
                  >
                    🗑️
                  </button>
                  <button
                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition border ${isCompleted ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-panel border-stroke text-fg-muted hover:border-primary"} ${isLoading ? "opacity-50" : ""}`}
                    onClick={() => handleToggle(m)}
                    disabled={isLoading}
                    title={isCompleted ? "Mark not done" : "Mark done"}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-surface group-white" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="pt-4 border-t border-stroke/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-fg-muted font-bold uppercase tracking-widest">Progress</span>
            <span className="text-xs font-bold text-primary tabular-nums">{Math.round((completedCount / milestones.length) * 100)}%</span>
          </div>
          <div className="bg-panel rounded-full h-1.5 overflow-hidden border border-stroke">
            <div 
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-[width] duration-700" 
              style={{ width: `${(completedCount / milestones.length) * 100}%` }} 
            />
          </div>
          
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="milestones"
          />
        </div>
      )}
    </div>
  );
};

export default MilestonesCard;
