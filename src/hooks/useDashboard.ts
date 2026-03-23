import { useQuery } from "@tanstack/react-query";
import useAppStore from "../store/useAppStore";
import { getMeetings } from "../api/meetingsApi";
import { getTaskItems } from "../api/tasksApi";
import { getProjects } from "../api/projectsApi";
import { listFolders, listWorkflows } from "../api/workflowsApi";
import { useMemo } from "react";
import type { Project } from "../types";

export interface ActiveProjectRow {
  project: Project;
  progress: number;
  stateLabel: "ACTIVE" | "DELAYED";
  doneCount: number;
  totalCount: number;
  description: string;
}

function isValidDate(d: string) {
  return !Number.isNaN(new Date(d).getTime());
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function useDashboard() {
  const user = useAppStore((s) => s.user);

  // 0. Base: Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getProjects(user.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // 1. Critical: Tasks for Active Projects
  const { data: projectTaskData = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard", "projects", "tasks", projects.map(p => p.id)],
    queryFn: async () => {
      const activeProjects = projects.filter((p) => p.status === "active").slice(0, 4);
      return Promise.all(
        activeProjects.map(async (p) => {
          const { data } = await getTaskItems(p.id);
          const tasks = data ?? [];
          const total = tasks.length;
          const done = tasks.filter((t) => t.status === "done").length;
          const progress = total === 0 ? 0 : Math.round((done / total) * 100);

          const today = startOfToday();
          const delayed = tasks.some((t) => {
            if (!t.deadline || t.status === "done") return false;
            return isValidDate(t.deadline) && new Date(t.deadline).getTime() < today.getTime();
          });

          return {
            project: p,
            tasks,
            total,
            done,
            progress,
            stateLabel: (delayed ? "DELAYED" : "ACTIVE") as "ACTIVE" | "DELAYED",
          };
        })
      );
    },
    enabled: projects.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // 2. Secondary: Meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["dashboard", "meetings", user?.id],
    queryFn: async () => {
      const { data } = await getMeetings(user!.id);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // 3. Lazy: Workflows
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ["dashboard", "workflows", user?.id],
    queryFn: async () => {
      const { data: folders } = await listFolders();
      const folder = (folders ?? [])[0];
      if (folder?.id) {
        const { data: wfData } = await listWorkflows(folder.id);
        return wfData ?? [];
      }
      return [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  // Derived data
  const processedData = useMemo(() => {
    const total = projectTaskData.reduce((acc, r) => acc + r.total, 0);
    const doneTotal = projectTaskData.reduce((acc, r) => acc + r.done, 0);
    const completionRate = total === 0 ? 0 : Math.round((doneTotal / total) * 1000) / 10;

    const rows: ActiveProjectRow[] = projectTaskData.map((r) => ({
      project: r.project,
      progress: r.progress,
      stateLabel: r.stateLabel,
      doneCount: r.done,
      totalCount: r.total,
      description: r.project.description,
    }));

    const today = startOfToday();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const upcoming = projectTaskData
      .flatMap((r) => r.tasks.map((t) => ({ task: t, projectName: r.project.name })))
      .filter(({ task }) => task.deadline && isValidDate(task.deadline) && task.status !== "done")
      .filter(({ task }) => {
        const dueMs = new Date(task.deadline as string).getTime();
        return dueMs >= today.getTime() && dueMs <= weekEnd.getTime();
      })
      .sort((a, b) => new Date(a.task.deadline as string).getTime() - new Date(b.task.deadline as string).getTime());

    const todayKey = today.toISOString().split("T")[0];
    const meetingsToday = meetings.filter((m: any) => m.scheduled_at?.startsWith(todayKey)).length;

    const activeTasks = projectTaskData.reduce((acc, r) => acc + (r.total - r.done), 0);

    return {
      rows,
      upcoming,
      meetingsToday,
      completionRate,
      activeTasks,
    };
  }, [projectTaskData, meetings]);

  return {
    projects,
    totalProjectsCount: projects.length,
    activeTaskCount: processedData.activeTasks,
    meetingsTodayCount: processedData.meetingsToday,
    completionRate: processedData.completionRate,
    activeProjectRows: processedData.rows,
    upcomingTasks: processedData.upcoming,
    workflows,
    loading: projectsLoading || tasksLoading,
    secondaryLoading: meetingsLoading || workflowsLoading,
    initialLoad: (projectsLoading || tasksLoading) && projects.length === 0,
  };
}
