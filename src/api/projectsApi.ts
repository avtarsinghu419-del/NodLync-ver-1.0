import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";
import type { Project, ProjectPayload } from "../types";

const SELECT_FIELDS = "id, name, description, status, user_id, created_at";

/** 
 * Fetches all projects for a user.
 * Includes projects they OWN and projects where they are a MEMBER.
 */
export async function getProjects(userId: string): Promise<ApiResponse<Project[]>> {
  try {
    // 1. Fetch project IDs where the user is a member
    const { data: membershipData, error: memError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (memError) throw memError;

    const membershipIds = (membershipData || []).map((m: any) => m.project_id);

    // 2. Build the query for projects (owned OR member)
    let query = supabase
      .from("projects")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false });

    if (membershipIds.length > 0) {
      // Use .in filter for better efficiency
      query = query.or(`user_id.eq.${userId},id.in.(${membershipIds.join(",")})`);
    } else {
      // Only owned projects
      query = query.eq("user_id", userId);
    }

    return handleApiResponse<Project[]>(query as any);
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function createProject(payload: ProjectPayload): Promise<ApiResponse<Project>> {
  const promise = supabase
    .from("projects")
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<Project>(promise as any);
}

export async function updateProject(id: string, payload: Partial<Project>): Promise<ApiResponse<Project>> {
  const promise = supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();
  return handleApiResponse<Project>(promise as any);
}

export async function deleteProject(id: string): Promise<ApiResponse<null>> {
  const promise = supabase
    .from("projects")
    .delete()
    .eq("id", id);
  return handleApiResponse<null>(promise as any);
}
