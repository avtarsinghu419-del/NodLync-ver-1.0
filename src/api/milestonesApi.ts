import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface Milestone {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  deadline?: string | null;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
}

const SELECT_FIELDS = "id, project_id, user_id, title, deadline, status, created_at";

export async function getMilestones(projectId: string): Promise<ApiResponse<Milestone[]>> {
  const promise = supabase
    .from("milestones")
    .select(SELECT_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return handleApiResponse<Milestone[]>(promise as any);
}

export async function createMilestone(payload: Omit<Milestone, "id" | "created_at">): Promise<ApiResponse<Milestone>> {
  const promise = supabase
    .from("milestones")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<Milestone>(promise as any);
}

export async function updateMilestone(id: string, payload: Partial<Milestone>): Promise<ApiResponse<Milestone>> {
  const promise = supabase
    .from("milestones")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<Milestone>(promise as any);
}

export async function deleteMilestone(id: string): Promise<ApiResponse<null>> {
  const promise = supabase
    .from("milestones")
    .delete()
    .eq("id", id);
  return handleApiResponse<null>(promise as any);
}
