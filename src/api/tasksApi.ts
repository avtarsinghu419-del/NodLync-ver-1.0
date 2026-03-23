import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface TaskItem {
  id: string;
  project_id: string;
  milestone_id: string;
  title: string;
  deadline?: string | null;
  status: "not_done" | "in_progress" | "done";
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
}

const SELECT_FIELDS = "id, project_id, milestone_id, title, deadline, status, is_completed, priority, created_at";

export async function getTaskItems(projectId: string): Promise<ApiResponse<TaskItem[]>> {
  const promise = supabase
    .from("task_items")
    .select(SELECT_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true }) as any;
  return handleApiResponse<TaskItem[]>(promise);
}

export async function createTaskItem(payload: Omit<TaskItem, "id" | "created_at">): Promise<ApiResponse<TaskItem>> {
  const promise = supabase
    .from("task_items")
    .insert({ ...payload, is_completed: payload.status === "done" })
    .select(SELECT_FIELDS)
    .single() as any;
  return handleApiResponse<TaskItem>(promise);
}

export async function updateTaskItem(id: string, payload: Partial<TaskItem>): Promise<ApiResponse<TaskItem>> {
  const promise = supabase
    .from("task_items")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single() as any;
  return handleApiResponse<TaskItem>(promise);
}

export async function deleteTaskItem(id: string): Promise<ApiResponse<null>> {
  const promise = supabase
    .from("task_items")
    .delete()
    .eq("id", id) as any;
  return handleApiResponse<null>(promise);
}
