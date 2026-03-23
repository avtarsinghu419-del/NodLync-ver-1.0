import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface ProjectReport {
  id: string;
  project_id: string;
  user_id: string;
  type: string;
  content: any;
  created_at: string;
}

const SELECT_FIELDS = "id, project_id, user_id, type, content, created_at";

export async function getProjectReports(projectId: string): Promise<ApiResponse<ProjectReport[]>> {
  const promise = supabase
    .from("project_reports")
    .select(SELECT_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return handleApiResponse<ProjectReport[]>(promise as any);
}

export async function createProjectReport(payload: Omit<ProjectReport, "id" | "created_at">): Promise<ApiResponse<ProjectReport>> {
  const promise = supabase
    .from("project_reports")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<ProjectReport>(promise as any);
}

export async function deleteProjectReport(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("project_reports").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}
