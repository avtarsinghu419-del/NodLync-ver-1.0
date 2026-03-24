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
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select(SELECT_FIELDS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ownedError) throw ownedError;

    const { data: memberships, error: memError } = await supabase
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", userId);

    if (memError) throw memError;

    const membershipIds = (memberships || []).map((member: any) => member.project_id);
    const membershipRoleByProjectId = new Map(
      (memberships || []).map((member: any) => [member.project_id, String(member.role).toLowerCase()])
    );

    let sharedProjects: Project[] = [];

    if (membershipIds.length > 0) {
      const { data, error } = await supabase
        .from("projects")
        .select(SELECT_FIELDS)
        .in("id", membershipIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      sharedProjects = (data || []).map((project: any) => ({
        ...project,
        access_role: (membershipRoleByProjectId.get(project.id) as Project["access_role"]) ?? "viewer",
        is_shared: project.user_id !== userId,
      }));
    }

    const normalizedOwnedProjects = (ownedProjects || []).map((project: any) => ({
      ...project,
      access_role: "owner" as const,
      is_shared: false,
    }));

    const dedupedProjects = new Map<string, Project>();

    [...normalizedOwnedProjects, ...sharedProjects].forEach((project) => {
      dedupedProjects.set(project.id, project);
    });

    const projects = Array.from(dedupedProjects.values()).sort((a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );

    return { data: projects, error: null };
  } catch (err: any) {
    console.error("getProjects error:", err);
    return {
      data: null,
      error: {
        message: err?.message ?? "Failed to load projects.",
        original: err,
      },
    };
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
