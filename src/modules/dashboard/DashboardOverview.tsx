import DashboardActiveProjectsOverview from "./DashboardActiveProjectsOverview";
import DashboardCalendarCard from "./DashboardCalendarCard";
import DashboardAiInsightsCard from "./DashboardAiInsightsCard";
import DashboardResearchCard from "./DashboardResearchCard";
import DashboardIdeaCard from "./DashboardIdeaCard";
import DashboardQuickActionsCard from "./DashboardQuickActionsCard";
import DashboardStatCard from "./DashboardStatCard";
import DashboardUpcomingTasksCard from "./DashboardUpcomingTasksCard";
import DashboardWorkflowsCard from "./DashboardWorkflowsCard";
import DashboardSkeleton from "./DashboardSkeleton";
import { useDashboard } from "../../hooks/useDashboard";
import { useMemo } from "react";

export default function DashboardOverview() {
  const {
    totalProjectsCount,
    activeTaskCount,
    meetingsTodayCount,
    completionRate,
    activeProjectRows,
    upcomingTasks,
    workflows,
    loading,
    initialLoad,
  } = useDashboard();

  const now = useMemo(() => new Date(), []);
  const calendarYear = now.getFullYear();
  const calendarMonthIndex = now.getMonth();

  const highlightedDays = useMemo(() => {
    const s = new Set<number>();
    upcomingTasks.forEach(({ task }) => {
      if (!task.deadline) return;
      const dt = new Date(task.deadline);
      if (dt.getFullYear() === calendarYear && dt.getMonth() === calendarMonthIndex) {
        s.add(dt.getDate());
      }
    });
    return s;
  }, [upcomingTasks, calendarYear, calendarMonthIndex]);

  if (initialLoad) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats Grid - Optimized for all screen sizes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          icon={<span className="text-lg">📁</span>}
          label="Total Projects"
          value={totalProjectsCount}
          tone="primary"
          meta={""}
        />
        <DashboardStatCard
          icon={<span className="text-lg">✅</span>}
          label="Active Tasks"
          value={activeTaskCount}
          tone="emerald"
        />
        <DashboardStatCard
          icon={<span className="text-lg">📅</span>}
          label="Meetings Today"
          value={String(meetingsTodayCount).padStart(2, "0")}
          tone="amber"
        />
        <DashboardStatCard
          icon={<span className="text-lg">📈</span>}
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          tone="primary"
        />
      </div>

      {/* Main Dashboard Layout Grid */}
      {/* Mobile: 1 col, Tablet: 2 cols (lg), Desktop: 3 cols (xl) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6">
        {/* Left Column (Main Focus) */}
        <div className="space-y-6 xl:col-span-5 lg:col-span-1">
          <DashboardActiveProjectsOverview
            rows={activeProjectRows}
            onViewAll={() => {
              // Placeholder behavior
            }}
          />
          <DashboardUpcomingTasksCard tasks={upcomingTasks} />
        </div>

        {/* Middle Column (Operational) */}
        <div className="space-y-6 xl:col-span-4 lg:col-span-1">
          <DashboardWorkflowsCard workflows={workflows} />
          <DashboardCalendarCard highlightedDays={highlightedDays} year={calendarYear} monthIndex={calendarMonthIndex} />
        </div>

        {/* Right Column (Insights & Actions) */}
        <div className="space-y-6 xl:col-span-3 lg:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
              <DashboardAiInsightsCard />
              <DashboardIdeaCard />
              <DashboardResearchCard />
              <DashboardQuickActionsCard />
           </div>
        </div>
      </div>

      {loading && !initialLoad ? (
        <div className="fixed top-4 right-4 bg-primary text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse z-50">
          Refreshing Data...
        </div>
      ) : null}
    </div>
  );
}
