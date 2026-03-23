import { supabase } from "./supabaseClient";
import { handleApiResponse, type ApiResponse } from "./apiHelper";

export interface WorkflowV2 {
  id: string;
  user_id: string;
  name: string;
  workflow_type?: 'visual' | 'imported';
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

// ── Workflows ──
export async function getWorkflow(id: string): Promise<ApiResponse<WorkflowV2>> {
  const promise = supabase.from("workflows_v2").select("*").eq("id", id).single();
  return handleApiResponse<WorkflowV2>(promise as any);
}

export async function listWorkflowsV2(userId: string): Promise<ApiResponse<WorkflowV2[]>> {
  const promise = supabase.from("workflows_v2").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return handleApiResponse<WorkflowV2[]>(promise as any);
}

export async function createWorkflowV2(payload: { 
  name: string; 
  user_id: string; 
  workflow_type?: 'visual' | 'imported';
  json_data?: any;
}): Promise<ApiResponse<WorkflowV2>> {
  const promise = supabase.from("workflows_v2").insert(payload).select("*").single();
  return handleApiResponse<WorkflowV2>(promise as any);
}

export async function deleteWorkflowV2(id: string): Promise<ApiResponse<null>> {
  const promise = supabase.from("workflows_v2").delete().eq("id", id);
  return handleApiResponse<null>(promise as any);
}

// ── Nodes & Edges ──
export async function getWorkflowData(workflowId: string): Promise<ApiResponse<{ nodes: WorkflowNode[], edges: WorkflowEdge[] }>> {
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
export async function saveWorkflowData(workflowId: string, nodes: any[], edges: any[]): Promise<ApiResponse<null>> {
  try {
    // 1. Delete existing
    const delNodes = supabase.from("workflow_nodes").delete().eq("workflow_id", workflowId);
    const delEdges = supabase.from("workflow_edges").delete().eq("workflow_id", workflowId);
    await Promise.all([delNodes, delEdges]);

    // 2. Prep data
    const nodesToSave = nodes.map(n => ({
      id: n.id,
      workflow_id: workflowId,
      type: n.data.type || 'default',
      label: n.data.label || 'Node',
      config: n.data.config || {},
      position_x: n.position.x,
      position_y: n.position.y
    }));

    const edgesToSave = edges.map(e => ({
      id: e.id,
      workflow_id: workflowId,
      source_node_id: e.source,
      target_node_id: e.target,
      source_handle: e.sourceHandle || null,
      target_handle: e.targetHandle || null
    }));

    // 3. Insert if anything exists
    if (nodesToSave.length > 0) {
      const { error: nErr } = await supabase.from("workflow_nodes").insert(nodesToSave);
      if (nErr) throw nErr;
    }
    
    if (edgesToSave.length > 0) {
      const { error: eErr } = await supabase.from("workflow_edges").insert(edgesToSave);
      if (eErr) throw eErr;
    }

    // 4. Update parent's updated_at
    await supabase.from("workflows_v2").update({ updated_at: new Date().toISOString() }).eq("id", workflowId);

    return { data: null, error: null };
  } catch (err: any) {
    console.error("Save workflow error:", err);
    return { data: null, error: err };
  }
}
