import type { TaskItem } from "../../api/tasksApi";

export type UpcomingTaskRow = {
  task: TaskItem;
  projectName: string;
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardUpcomingTasksCard({
  tasks,
}: {
  tasks: UpcomingTaskRow[];
}) {
  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">🕒</span>
          <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">Upcoming Tasks</h3>
        </div>
        <span className="shrink-0 text-[10px] font-mono text-fg-muted">{tasks.length} items</span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stroke/60 p-6 text-sm text-fg-muted">
          No upcoming tasks with deadlines.
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.slice(0, 6).map((row) => {
            const due = formatDate(row.task.deadline);
            return (
              <li
                key={row.task.id}
                className="flex items-start gap-3 rounded-2xl border border-stroke/50 bg-panel/10 px-3 py-2"
              >
                <span className="w-2 h-2 mt-2 rounded-full bg-primary/80" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-fg">
                      {row.task.title}
                    </p>
                    {due ? (
                      <span className="text-[10px] text-fg-muted font-mono whitespace-nowrap">
                        {due}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-fg-muted truncate">
                    {row.projectName}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
