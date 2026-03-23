import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
  user_profiles?: {
    display_name: string;
    email?: string; 
  };
}

export interface UserSearchResult {
  id: string;
  display_name: string;
  email: string;
}

/** 
 * Fetches all project members. 
 * Performs a manual manual for user profiles to bypass relationship schema cache errors.
 */
export async function getProjectMembers(projectId: string): Promise<ApiResponse<ProjectMember[]>> {
  try {
    // 1. Fetch raw project members
    const { data: members, error: memError } = await supabase
      .from("project_members")
      .select("id, project_id, user_id, role, created_at")
      .eq("project_id", projectId);

    if (memError) throw memError;

    if (!members || members.length === 0) return { data: [], error: null };

    // 2. Fetch related profiles for those users
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles, error: profError } = await supabase
      .from("user_profiles")
      .select("id, display_name")
      .in("id", userIds);

    if (profError) throw profError;

    // 3. Merge profiles back into members
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const mergedMembers = members.map((m: any) => ({
      ...m,
      user_profiles: profileMap[m.user_id] || { display_name: "Unknown User" }
    }));

    return { data: mergedMembers as ProjectMember[], error: null };
  } catch (err: any) {
    console.error("getProjectMembers error:", err);
    return { data: null, error: err };
  }
}

export async function addProjectMember(payload: { 
  project_id: string; 
  user_id: string; 
  role: string 
}): Promise<ApiResponse<ProjectMember>> {
  // First insert
  const { data, error } = await supabase
    .from("project_members")
    .insert(payload)
    .select("id, project_id, user_id, role, created_at")
    .single();
    
  if (error) return { data: null, error };

  // Then fetch profile for the new member
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("id", data.user_id)
    .single();

  return { 
    data: { ...data, user_profiles: profile } as any as ProjectMember, 
    error: null 
  };
}

export async function updateProjectMemberRole(id: string, role: string): Promise<ApiResponse<ProjectMember>> {
  const promise = supabase
    .from("project_members")
    .update({ role })
    .eq("id", id)
    .select("id, project_id, user_id, role, created_at")
    .single();
    
  return handleApiResponse<ProjectMember>(promise as any);
}

export async function deleteProjectMember(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("project_members").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}

/** 
 * User search functionality 
 * Explicitly searches user_profiles by display_name. 
 */
export async function searchUsers(query: string): Promise<ApiResponse<UserSearchResult[]>> {
  if (!query.trim()) return { data: [], error: null };
  
  const searchPromise = supabase
    .from("user_profiles")
    .select("id, display_name")
    .ilike("display_name", `%${query}%`)
    .limit(10);
    
  return handleApiResponse<UserSearchResult[]>(searchPromise as any);
}
