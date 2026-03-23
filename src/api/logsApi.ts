import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface ProjectLog {
  id: string;
  project_id: string;
  user_id: string;
  completed_work: string;
  next_steps: string;
  blockers: string;
  notes?: string;
  created_at: string;
}

const SELECT_FIELDS = "id, project_id, user_id, completed_work, next_steps, blockers, notes, created_at";

export async function getProjectLogs(projectId: string): Promise<ApiResponse<ProjectLog[]>> {
  const promise = supabase
    .from("project_logs")
    .select(SELECT_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);
  return handleApiResponse<ProjectLog[]>(promise as any);
}

export async function getAllProjectLogs(projectId: string): Promise<ApiResponse<ProjectLog[]>> {
  const promise = supabase
    .from("project_logs")
    .select(SELECT_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return handleApiResponse<ProjectLog[]>(promise as any);
}

export async function getProjectLogsPage(
  projectId: string,
  page: number,
  pageSize: number
): Promise<ApiResponse<{ logs: ProjectLog[]; total: number }>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  try {
    const result = await supabase
      .from("project_logs")
      .select(SELECT_FIELDS, { count: "exact" })
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(from, to);
    
    if (result.error) throw result.error;

    return {
      data: {
        logs: (result.data ?? []) as ProjectLog[],
        total: result.count ?? 0,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || "Failed to fetch log history." },
    };
  }
}

export async function createProjectLog(
  payload: Omit<ProjectLog, "id" | "created_at">
): Promise<ApiResponse<ProjectLog>> {
  const promise = supabase
    .from("project_logs")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<ProjectLog>(promise as any);
}

export async function getDailyLogsAcrossProjects(
  userId: string
): Promise<ApiResponse<(ProjectLog & { projects: { name: string } })[]>> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const promise = supabase
    .from("project_logs")
    .select(`
      ${SELECT_FIELDS},
      projects ( name )
    `)
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  return handleApiResponse<any>(promise as any);
}
