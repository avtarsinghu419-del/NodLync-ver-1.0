import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

const WORKFLOW_JSON_SENTINEL = "__NODLYNC_JSON__:";

export interface WorkflowV2 {
  id: string;
  user_id: string;
  name: string;
  workflow_type?: "visual" | "imported";
  json_data?: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  type: string;
  label: string;
  config: any;
  position_x: number;
  position_y: number;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string;
  target_handle?: string;
}

function extractMissingWorkflowColumn(error: any): string | null {
  const message = String(error?.message ?? "");
  const match = message.match(/Could not find the '([^']+)' column of 'workflows_v2'/i);
  return match?.[1] ?? null;
}

function normalizeWorkflowRow(row: any): WorkflowV2 {
  let jsonData = row?.json_data;
  let description = row?.description;

  if (
    (jsonData === undefined || jsonData === null) &&
    typeof description === "string" &&
    description.startsWith(WORKFLOW_JSON_SENTINEL)
  ) {
    try {
      jsonData = JSON.parse(description.slice(WORKFLOW_JSON_SENTINEL.length));
      description = "";
    } catch (error) {
      console.error("Failed to parse fallback workflow JSON", error);
    }
  }

  return {
    ...row,
    json_data: jsonData,
    description,
  } as WorkflowV2;
}

// Workflows
export async function getWorkflow(id: string): Promise<ApiResponse<WorkflowV2>> {
  const response = await handleApiResponse<WorkflowV2>(
    supabase.from("workflows_v2").select("*").eq("id", id).single() as any
  );

  if (response.error || !response.data) {
    return response;
  }

  return { data: normalizeWorkflowRow(response.data), error: null };
}

export async function listWorkflowsV2(userId: string): Promise<ApiResponse<WorkflowV2[]>> {
  const response = await handleApiResponse<WorkflowV2[]>(
    supabase
      .from("workflows_v2")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any
  );

  if (response.error || !response.data) {
    return response;
  }

  return {
    data: response.data.map((row) => normalizeWorkflowRow(row)),
    error: null,
  };
}

export async function createWorkflowV2(payload: {
  name: string;
  user_id: string;
  workflow_type?: "visual" | "imported";
  json_data?: any;
  projectId?: string;
}): Promise<ApiResponse<WorkflowV2>> {
  const workflowType = payload.workflow_type ?? "visual";
  const now = new Date().toISOString();
  const compatJsonText =
    payload.json_data !== undefined
      ? `${WORKFLOW_JSON_SENTINEL}${JSON.stringify(payload.json_data)}`
      : undefined;

  const baseJson =
    payload.json_data ??
    (workflowType === "visual" ? { nodes: [], edges: [] } : {});

  const json_data =
    payload.projectId && baseJson && typeof baseJson === "object" && !Array.isArray(baseJson)
      ? { ...baseJson, __nodlync: { ...(baseJson as any).__nodlync, projectId: payload.projectId } }
      : baseJson;

  let workflowPayload: Record<string, any> = {
    id: crypto.randomUUID(),
    name: payload.name,
    user_id: payload.user_id,
    workflow_type: workflowType,
    json_data,
    description: workflowType === "imported" ? compatJsonText : undefined,
    created_at: now,
    updated_at: now,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("workflows_v2")
      .insert(workflowPayload)
      .select("*")
      .single();

    if (!error) {
      return { data: normalizeWorkflowRow(data), error: null };
    }

    const missingColumn = extractMissingWorkflowColumn(error);
    if (!missingColumn || !(missingColumn in workflowPayload)) {
      return {
        data: null,
        error: {
          message: error.message ?? "Failed to create workflow.",
          original: error,
        },
      };
    }

    if (missingColumn === "json_data" && compatJsonText && !("description" in workflowPayload)) {
      workflowPayload.description = compatJsonText;
    }

    delete workflowPayload[missingColumn];
  }

  return {
    data: null,
    error: { message: "Failed to create workflow due to schema mismatch." },
  };
}

export async function deleteWorkflowV2(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("workflows_v2").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}

// Nodes & Edges
export async function getWorkflowData(
  workflowId: string
): Promise<ApiResponse<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>> {
  try {
    const nodesPromise = supabase.from("workflow_nodes").select("*").eq("workflow_id", workflowId);
    const edgesPromise = supabase.from("workflow_edges").select("*").eq("workflow_id", workflowId);

    const [nodesRes, edgesRes] = await Promise.all([nodesPromise, edgesPromise]);

    if (nodesRes.error) throw nodesRes.error;
    if (edgesRes.error) throw edgesRes.error;

    return { data: { nodes: nodesRes.data || [], edges: edgesRes.data || [] }, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Atomically saves the entire workflow state.
 */
export async function saveWorkflowData(
  workflowId: string,
  nodes: any[],
  edges: any[]
): Promise<ApiResponse<null>> {
  try {
    const delNodes = supabase.from("workflow_nodes").delete().eq("workflow_id", workflowId);
    const delEdges = supabase.from("workflow_edges").delete().eq("workflow_id", workflowId);
    await Promise.all([delNodes, delEdges]);

    const nodesToSave = nodes.map((node) => ({
      id: node.id,
      workflow_id: workflowId,
      type: node.data.type || "default",
      label: node.data.label || "Node",
      config: node.data.config || {},
      position_x: node.position.x,
      position_y: node.position.y,
    }));

    const edgesToSave = edges.map((edge) => ({
      id: edge.id,
      workflow_id: workflowId,
      source_node_id: edge.source,
      target_node_id: edge.target,
      source_handle: edge.sourceHandle || null,
      target_handle: edge.targetHandle || null,
    }));

    if (nodesToSave.length > 0) {
      const { error: nodesError } = await supabase.from("workflow_nodes").insert(nodesToSave);
      if (nodesError) throw nodesError;
    }

    if (edgesToSave.length > 0) {
      const { error: edgesError } = await supabase.from("workflow_edges").insert(edgesToSave);
      if (edgesError) throw edgesError;
    }

    await supabase
      .from("workflows_v2")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", workflowId);

    return { data: null, error: null };
  } catch (err: any) {
    console.error("Save workflow error:", err);
    return { data: null, error: err };
  }
}
