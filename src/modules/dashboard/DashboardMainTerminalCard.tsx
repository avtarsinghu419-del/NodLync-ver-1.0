import useAppStore from "../../store/useAppStore";

export default function DashboardMainTerminalCard() {
  const appLogs = useAppStore((s) => s.appLogs);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">💻</span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-muted text-wrap-balance">
              Main System Terminal
            </p>
            <p className="text-[11px] text-fg-muted">Recent activity</p>
          </div>
        </div>
        <div className="shrink-0 text-xs font-mono text-fg-muted">
          {appLogs.length ? `${Math.min(6, appLogs.length)} shown` : "empty"}
        </div>
      </div>

      <div className="rounded-2xl border border-stroke bg-panel/20 p-3">
        {appLogs.length === 0 ? (
          <div className="text-sm text-fg-muted">
            No system logs yet. Open Settings → System Logs to view.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-[12px] leading-relaxed text-fg-secondary">
            {appLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="flex gap-3">
                <span className="shrink-0 text-fg-muted">
                  {log.timestamp
                    ? String(
                        new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      )
                    : "—"}
                </span>
                <span
                  className={`min-w-0 overflow-anywhere ${
                    log.type === "success"
                      ? "text-emerald-300"
                      : log.type === "error"
                        ? "text-rose-300"
                        : "text-fg-secondary"
                  }`}
                >
                  [{log.type}] {log.module}: {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
