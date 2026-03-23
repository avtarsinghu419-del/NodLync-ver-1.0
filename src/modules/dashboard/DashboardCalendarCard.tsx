import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay(); // 0=Sun

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = 42; // 6 weeks

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
  monthIndex: number; // 0-11
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
    // Only allow clicking today or future relative to today's date
    const clickedDate = new Date(year, monthIndex, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (clickedDate.getTime() >= todayDate.getTime()) {
      setSelectedDay(day === selectedDay ? null : day);
    }
  };

  const goToAddMeeting = () => {
    if (!selectedDay) return;
    const dt = new Date(year, monthIndex, selectedDay);
    // Format as YYYY-MM-DD for consistency
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    navigate("/meetings", { state: { createForDate: formattedDate } });
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-slate-200 text-sm">{monthLabel}</h3>
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

      <div className="grid grid-cols-7 gap-1 text-xs text-slate-500">
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

          let bgClasses = "text-slate-300 hover:bg-slate-800/30";
          if (isToday) {
            bgClasses = "bg-primary/20 border-primary/50 text-primary font-bold shadow-[0_0_8px_rgba(56,189,248,0.3)]";
          } else if (isSelected) {
            bgClasses = "bg-primary text-slate-900 font-bold shadow-sm";
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
              className={`h-9 flex items-center justify-center rounded-lg border border-transparent ${bgClasses}`}
              title={isToday ? "Today" : isHighlighted ? "Items scheduled" : ""}
            >
              {c.day}
            </div>
          );
        })}
      </div>

      {/* Add Schedule option floating/inline below */}
      {selectedDay && (
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            {new Date(year, monthIndex, selectedDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <button 
            onClick={goToAddMeeting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-slate-900 rounded-lg text-xs font-bold hover:brightness-110 transition-all active:scale-95"
          >
            <span>➕</span> Add Schedule
          </button>
        </div>
      )}
    </div>
  );
}

