import { supabase } from "./supabaseClient";

export type WorkflowRowType = "folder" | "workflow";

export type WorkflowsRow = {
  id: string;
  name: string;
  type: WorkflowRowType;
  parent_id: string | null;
  json_data: any | null;
  created_at: string;
};

const TABLE = "workflows";

export async function listFolders() {
  return supabase
    .from(TABLE)
    .select("*")
    .eq("type", "folder")
    .order("created_at", { ascending: true }) as Promise<{
    data: WorkflowsRow[] | null;
    error: { message: string } | null;
  }>;
}

export async function listWorkflows(folderId: string) {
  return supabase
    .from(TABLE)
    .select("*")
    .eq("type", "workflow")
    .eq("parent_id", folderId)
    .order("created_at", { ascending: false }) as Promise<{
    data: WorkflowsRow[] | null;
    error: { message: string } | null;
  }>;
}

export async function folderNameExists(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  // Keep it simple/portable: fetch folder names and compare case-insensitively.
  const { data, error } = (await supabase
    .from(TABLE)
    .select("name")
    .eq("type", "folder")) as any;
  if (error) return false;
  if (!Array.isArray(data)) return false;
  return data.some((r) => typeof r?.name === "string" && r.name.toLowerCase() === trimmed.toLowerCase());
}

export async function createFolder(name: string) {
  const payload = {
    name: name.trim(),
    type: "folder" as const,
    parent_id: null,
    json_data: null,
  };
  return supabase.from(TABLE).insert(payload).select("*").single() as Promise<{
    data: WorkflowsRow | null;
    error: { message: string } | null;
  }>;
}

export async function createWorkflow(payload: {
  name: string;
  parent_id: string;
  json_data: any;
}) {
  const row = {
    name: payload.name.trim(),
    type: "workflow" as const,
    parent_id: payload.parent_id,
    json_data: payload.json_data,
  };
  return supabase.from(TABLE).insert(row).select("*").single() as Promise<{
    data: WorkflowsRow | null;
    error: { message: string } | null;
  }>;
}

export async function deleteWorkflow(id: string) {
  return supabase.from(TABLE).delete().eq("id", id) as Promise<{
    data: any;
    error: { message: string } | null;
  }>;
}

export async function deleteFolderCascade(folderId: string) {
  // Delete folder + all workflows under it
  return supabase
    .from(TABLE)
    .delete()
    .or(`id.eq.${folderId},parent_id.eq.${folderId}`) as Promise<{
    data: any;
    error: { message: string } | null;
  }>;
}

