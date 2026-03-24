export type WorkflowNodeType =
  | "llm"
  | "api"
  | "condition"
  | "delay"
  | "transform"
  | "custom";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType | string;
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id?: string;
  source: string;
  target: string;
}

export interface WorkflowExecutionContext {
  input: any;
  outputs: Record<string, any>;
}

export type WorkflowNodeExecutionStatus = "idle" | "running" | "success" | "failed";

export interface WorkflowNodeExecutionState {
  status: WorkflowNodeExecutionStatus;
  output?: any;
  error?: string | null;
}

export type WorkflowNodeHandler = (args: {
  node: WorkflowNode;
  input: any;
  context: WorkflowExecutionContext;
}) => Promise<any> | any;

export interface WorkflowEngineOptions {
  handlers?: Record<string, WorkflowNodeHandler>;
  onNodeStateChange?: (
    nodeId: string,
    state: WorkflowNodeExecutionState
  ) => void;
}

const defaultHandlers: Record<string, WorkflowNodeHandler> = {
  delay: async ({ input, node }) => {
    const ms = Number(node.config?.ms ?? 500);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return input;
  },
  transform: ({ input, node }) => {
    const template = node.config?.template;
    if (typeof template === "string") {
      return template.replace("{{input}}", String(input ?? ""));
    }
    return input;
  },
  condition: ({ input, node }) => {
    const equals = node.config?.equals;
    if (equals === undefined) return input;
    return input === equals ? input : null;
  },
};

const buildGraph = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
    indegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) return;
    outgoing.get(e.source)!.push(e.target);
    incoming.get(e.target)!.push(e.source);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  });

  return { nodeMap, outgoing, incoming, indegree };
};

export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: any,
  options: WorkflowEngineOptions = {}
) {
  const { nodeMap, outgoing, incoming, indegree } = buildGraph(nodes, edges);
  const queue: string[] = [];
  const order: string[] = [];

  indegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    (outgoing.get(id) ?? []).forEach((next) => {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    });
  }

  if (order.length !== nodes.length) {
    throw new Error("Workflow contains a cycle. DAG execution required.");
  }

  const outputs: Record<string, any> = {};
  const context: WorkflowExecutionContext = { input, outputs };
  const handlers = { ...defaultHandlers, ...(options.handlers ?? {}) };
  const nodeStates: Record<string, WorkflowNodeExecutionState> = Object.fromEntries(
    nodes.map((node) => [node.id, { status: "idle", error: null }])
  );

  for (const id of order) {
    const node = nodeMap.get(id);
    if (!node) continue;
    const incomingIds = incoming.get(id) ?? [];
    let nodeInput: any = input;
    if (incomingIds.length === 1) {
      nodeInput = outputs[incomingIds[0]];
    } else if (incomingIds.length > 1) {
      nodeInput = Object.fromEntries(incomingIds.map((src) => [src, outputs[src]]));
    }

    const handler = handlers[node.type] ?? (({ input: passthrough }) => passthrough);
    nodeStates[id] = { status: "running", error: null };
    options.onNodeStateChange?.(id, nodeStates[id]);

    try {
      outputs[id] = await handler({ node, input: nodeInput, context });
      nodeStates[id] = {
        status: "success",
        output: outputs[id],
        error: null,
      };
      options.onNodeStateChange?.(id, nodeStates[id]);
    } catch (error: any) {
      nodeStates[id] = {
        status: "failed",
        error: error?.message ?? "Node execution failed.",
      };
      options.onNodeStateChange?.(id, nodeStates[id]);
      throw error;
    }
  }

  return { outputs, order, nodeStates };
}
