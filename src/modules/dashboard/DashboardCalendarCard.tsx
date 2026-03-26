import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = 42;

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    cells.push({ day: dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null });
  }
  return cells;
}

export default function DashboardCalendarCard({
  highlightedDays,
  year,
  monthIndex,
}: {
  highlightedDays: Set<number>;
  year: number;
  monthIndex: number;
}) {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthLabel = useMemo(() => {
    const d = new Date(year, monthIndex, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [year, monthIndex]);

  const cells = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const currentDay = today.getDate();

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, monthIndex, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (clickedDate.getTime() >= todayDate.getTime()) {
      setSelectedDay(day === selectedDay ? null : day);
    }
  };

  const goToAddMeeting = () => {
    if (!selectedDay) return;
    const dt = new Date(year, monthIndex, selectedDay);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    navigate("/meetings", { state: { createForDate: `${yyyy}-${mm}-${dd}` } });
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="min-w-0 text-sm font-semibold text-fg-secondary text-wrap-balance">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost text-xs" disabled>
            ←
          </button>
          <button type="button" className="btn-ghost text-xs" disabled>
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-fg-muted">
        {dayNames.map((n, idx) => (
          <div key={`${n}-${idx}`} className="text-center">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-sm">
        {cells.map((c, idx) => {
          if (!c.day) {
            return <div key={idx} className="h-9" />;
          }

          const isHighlighted = highlightedDays.has(c.day);
          const isToday = isCurrentMonth && c.day === currentDay;
          const clickedDate = new Date(year, monthIndex, c.day);
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isPast = clickedDate.getTime() < todayDate.getTime();
          const isSelected = selectedDay === c.day;

          let bgClasses = "text-fg-secondary hover:bg-surface/30";
          if (isToday) {
            bgClasses = "bg-primary/20 border-primary/50 text-primary font-bold shadow-[0_0_8px_rgba(56,189,248,0.3)]";
          } else if (isSelected) {
            bgClasses = "bg-primary text-on-primary font-bold shadow-sm";
          } else if (isHighlighted) {
            bgClasses = "bg-primary/10 border-primary/30 text-primary";
          }

          if (isPast && !isToday) {
            bgClasses += " opacity-40 cursor-not-allowed hover:bg-transparent";
          } else {
            bgClasses += " cursor-pointer hover:border-primary/50 transition-colors";
          }

          return (
            <div
              key={idx}
              onClick={() => {
                if (!isPast || isToday) handleDayClick(c.day!);
              }}
              className={`flex h-9 items-center justify-center rounded-xl border border-transparent ${bgClasses}`}
              title={isToday ? "Today" : isHighlighted ? "Items scheduled" : ""}
            >
              {c.day}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="flex items-center justify-between border-t border-stroke/60 pt-3 animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-medium tracking-wide text-fg-muted">
            {new Date(year, monthIndex, selectedDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <button
            type="button"
            onClick={goToAddMeeting}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition active:scale-95 hover:brightness-110"
          >
            <span>➕</span> Add Schedule
          </button>
        </div>
      )}
    </div>
  );
}
