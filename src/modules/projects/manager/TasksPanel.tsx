import { useState } from "react";
import type { TaskItem } from "../../../api/tasksApi";
import BulkDeleteBar from "../../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../../components/IndeterminateCheckbox";
import PaginationControls from "../../../components/PaginationControls";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { usePagination } from "../../../hooks/usePagination";

interface Props {
  tasks: TaskItem[];
  projectId: string;
  userId: string;
  onAdd: (payload: { title: string; deadline?: string | null }) => Promise<void>;
  onUpdate: (taskId: string, updates: Pick<TaskItem, "priority" | "status" | "is_completed">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  busy?: boolean;
}

const PRIORITY_OPTIONS: Array<{ value: TaskItem["priority"]; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_OPTIONS: Array<{ value: TaskItem["status"]; label: string }> = [
  { value: "not_done", label: "Not Done" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const TasksPanel = ({ tasks, onAdd, onUpdate, onDelete, onBulkDelete, busy }: Props) => {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "done" | "not_done" | "in_progress">("all");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const formatDeadline = (d: string | null | undefined) => {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered =
    filter === "all"
      ? tasks
      : filter === "done"
        ? tasks.filter((t) => t.status === "done")
        : filter === "in_progress"
          ? tasks.filter((t) => t.status === "in_progress")
          : tasks.filter((t) => t.status === "not_done");
  const pagination = usePagination(filtered);
  const selection = useBulkSelection(filtered, (task) => task.id);
  const pageState = selection.getPageState(pagination.paginatedItems);

  const handleAdd = async () => {
    setValidationError(null);
    if (!input.trim()) {
      setValidationError("Task title is required.");
      return;
    }
    await onAdd({
      title: input.trim(),
      deadline: deadline ? deadline : null,
    });
    setInput("");
    setDeadline("");
  };

  const handleUpdate = async (
    task: TaskItem,
    updates: Partial<Pick<TaskItem, "priority" | "status" | "is_completed">>
  ) => {
    setSavingId(task.id);
    const next = {
      priority: updates.priority ?? task.priority,
      status: updates.status ?? task.status,
      is_completed: updates.is_completed ?? (updates.status ? updates.status === "done" : task.is_completed),
    };
    await onUpdate(task.id, next);
    setSavingId(null);
  };

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    if (!window.confirm(`Delete ${selection.selectedCount} selected task(s)?`)) return;
    setBulkDeleting(true);
    await onBulkDelete(Array.from(selection.selectedIds));
    selection.clearSelection();
    setBulkDeleting(false);
  };

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    notDone: tasks.filter((t) => t.status === "not_done").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-300" },
          { label: "Not Done", value: stats.notDone, color: "text-slate-400" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-400" },
          { label: "Done", value: stats.done, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-panel p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex gap-2 w-full">
          <input
            className="flex-1 rounded-xl border border-slate-700 bg-surface px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-slate-600 shadow-inner"
            placeholder="Add a task and press Enter..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <input
            type="date"
            className="w-40 rounded-xl border border-slate-700 bg-surface px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Task deadline"
          />
          <button className="btn-primary py-3 px-6 text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98]" onClick={handleAdd} disabled={busy || !input.trim()}>
            ADD
          </button>
        </div>
      </div>

      {validationError && (
        <div className="mt-1">
          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-1 rounded-full uppercase tracking-widest">
            ⚠ {validationError}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-slate-800/50">
          {(["all", "not_done", "in_progress", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                pagination.setCurrentPage(1);
                selection.clearSelection();
              }}
              className={`text-[10px] px-4 py-2 rounded-lg transition font-bold uppercase tracking-widest ${filter === f ? "bg-slate-700 text-slate-100 shadow-md" : "text-slate-500 hover:text-slate-300"}`}
            >
              {f === "all" ? "All" : f === "not_done" ? "Not Done" : f === "in_progress" ? "In Progress" : "Done"}
            </button>
          ))}
        </div>
        
        <BulkDeleteBar
          count={selection.selectedCount}
          label="tasks"
          onDelete={handleBulkDelete}
          onClear={selection.clearSelection}
          busy={bulkDeleting}
        />
      </div>

      <div className="glass-panel overflow-hidden border-slate-800/50">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
             <span className="text-4xl opacity-20">📝</span>
             <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-400">{filter === "all" ? "No Tasks Under This Milestone" : `No ${filter.replace("_", " ")} tasks.`}</p>
                <p className="text-xs text-slate-600">Break down your goals into actionable items.</p>
             </div>
             {filter === "all" && (
                <div className="text-[10px] text-slate-700 font-bold uppercase tracking-widest animate-pulse">
                   Type above to add your first task ➔
                </div>
             )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            <div className="flex items-center gap-3 px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-800/10">
              <IndeterminateCheckbox
                checked={pageState.checked}
                indeterminate={pageState.indeterminate}
                onChange={() => selection.togglePage(pagination.paginatedItems)}
                ariaLabel="Select all visible tasks"
              />
              <span>Project Task Stream</span>
            </div>
            {pagination.paginatedItems.map((task) => {
              const isLoading = savingId === task.id;
              return (
                <div key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/20 transition group border-l-2 border-transparent hover:border-primary/40">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(task.id)}
                    onChange={() => selection.toggleOne(task.id)}
                    className="h-4 w-4 accent-primary rounded bg-slate-900 border-slate-700"
                    aria-label={`Select ${task.title}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium transition-colors ${task.status === "done" ? "line-through text-slate-500" : "text-slate-200"}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] text-slate-600 font-mono">
                        {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {task.deadline && (
                        <span className="text-[10px] text-primary/60 font-medium px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                          Due {formatDeadline(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        value={task.priority}
                        onChange={(e) => handleUpdate(task, { priority: e.target.value as TaskItem["priority"] })}
                        disabled={isLoading}
                        aria-label="Task priority"
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900 uppercase">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        value={task.status}
                        onChange={(e) => handleUpdate(task, { status: e.target.value as TaskItem["status"], is_completed: e.target.value === "done" })}
                        disabled={isLoading}
                        aria-label="Task status"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900 uppercase">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-2 bg-slate-800/40 rounded-lg hover:bg-rose-500/10" onClick={() => onDelete(task.id)} title="Delete task">
                       🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="pt-2">
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="tasks"
          />
        </div>
      )}
    </div>
  );
};

export default TasksPanel;
