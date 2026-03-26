import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  MarkerType,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { getWorkflowData, saveWorkflowData } from "../../api/workflowEditorApi";
import GeneratedText from "../../components/GeneratedText";
import InlineSpinner from "../../components/InlineSpinner";
import {
  executeWorkflow,
  type WorkflowNodeExecutionState,
} from "./workflowEngine";

const NODE_TYPES = {
  api_call: "API Call",
  ai_model: "AI Model",
  condition: "Condition",
  delay: "Delay",
  transform: "Transform",
};

interface Props {
  workflowId: string;
  onClose: () => void;
}

const EMPTY_NODE_STATE: WorkflowNodeExecutionState = {
  status: "idle",
  error: null,
};

const WorkflowEditor = ({ workflowId, onClose }: Props) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runInput, setRunInput] = useState("Sample workflow input");
  const [lastRunOrder, setLastRunOrder] = useState<string[]>([]);
  const [executionStates, setExecutionStates] = useState<
    Record<string, WorkflowNodeExecutionState>
  >({});

  const resetExecutionStates = (nextNodes: Node[]) => {
    setExecutionStates(
      Object.fromEntries(nextNodes.map((node) => [node.id, EMPTY_NODE_STATE]))
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await getWorkflowData(workflowId);

      if (error) {
        console.error("Workflow load failed", error);
        setLoadError(error.message ?? "Failed to load workflow.");
        setLoading(false);
        return;
      }

      const nextNodes = (data?.nodes || []).map((node) => ({
        id: node.id,
        type: "default",
        position: { x: node.position_x, y: node.position_y },
        data: { label: node.label, config: node.config, type: node.type },
      }));
      const nextEdges = (data?.edges || []).map((edge) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        sourceHandle: edge.source_handle,
        targetHandle: edge.target_handle,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" },
        style: { stroke: "#60a5fa", strokeWidth: 2 },
      }));

      setNodes(nextNodes);
      setEdges(nextEdges);
      resetExecutionStates(nextNodes);
      setLoading(false);
    };

    void load();
  }, [workflowId]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((current) => applyNodeChanges(changes, current)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((current) => applyEdgeChanges(changes, current)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((current) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" },
            style: { stroke: "#60a5fa", strokeWidth: 2 },
          },
          current
        )
      ),
    []
  );

  const addNode = (type: keyof typeof NODE_TYPES) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "default",
      position: { x: 100, y: 100 },
      data: {
        label: NODE_TYPES[type],
        type,
        config: type === "api_call" ? { url: "", method: "GET" } : {},
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      resetExecutionStates(next);
      return next;
    });
  };

  const updateNodeConfig = (nodeId: string, updates: any) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        return { ...node, data: { ...node.data, ...updates } };
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((current: any) =>
        current ? { ...current, data: { ...current.data, ...updates } } : null
      );
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes((current) => {
      const next = current.filter((node) => node.id !== nodeId);
      resetExecutionStates(next);
      return next;
    });
    setEdges((current) =>
      current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    setSelectedNode(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const { error } = await saveWorkflowData(workflowId, nodes, edges);
    if (error) {
      console.error("Workflow save failed", error);
      setSaveError(error.message ?? "Failed to save workflow.");
    }
    setSaving(false);
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);
    setLastRunOrder([]);
    resetExecutionStates(nodes);

    try {
      const result = await executeWorkflow(
        nodes.map((node) => ({
          id: node.id,
          type: String((node.data as any).type ?? "transform"),
          config: (node.data as any).config ?? {},
        })),
        edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
        runInput,
        {
          handlers: {
            api_call: async ({ node, input }) => ({
              request: {
                method: node.config?.method ?? "GET",
                url: node.config?.url ?? "",
              },
              input,
            }),
            ai_model: ({ node, input }) => {
              const prompt =
                typeof node.config?.prompt === "string" ? node.config.prompt : "";
              if (!prompt) {
                return { model: node.config?.model ?? "manual", input };
              }
              return prompt.replace("{{input}}", String(input ?? ""));
            },
          },
          onNodeStateChange: (nodeId, state) => {
            setExecutionStates((current) => ({ ...current, [nodeId]: state }));
          },
        }
      );

      setLastRunOrder(result.order);
    } catch (error: any) {
      console.error("Workflow execution failed", error);
      setRunError(error?.message ?? "Workflow execution failed.");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-panel/80 backdrop-blur-xl">
        <InlineSpinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-panel p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-800/40 bg-rose-950/30 p-6 text-rose-200 space-y-4">
          <h2 className="text-lg font-bold">Workflow failed to load</h2>
          <p className="text-sm leading-relaxed">{loadError}</p>
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-panel overflow-hidden font-sans">
      <header className="h-16 border-b border-stroke bg-panel/50 flex items-center justify-between px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors text-fg-muted font-bold">
            EXIT
          </button>
          <div className="h-6 w-px bg-surface" />
          <h2 className="text-sm font-black text-fg uppercase tracking-widest">Workflow Studio</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={running || nodes.length === 0}
            className="px-6 py-2 text-xs font-black tracking-widest uppercase rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
          >
            {running ? <InlineSpinner compact /> : "RUN FLOW"}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 text-xs font-black tracking-widest uppercase whitespace-nowrap">
            {saving ? <InlineSpinner compact /> : "DEPLOY & SAVE"}
          </button>
        </div>
      </header>

      {(saveError || runError) && (
        <div className="border-b border-stroke bg-rose-950/30 px-6 py-3 text-sm text-rose-200 flex items-center justify-between gap-4">
          <span>{saveError ?? runError}</span>
          <button
            onClick={() => {
              setSaveError(null);
              setRunError(null);
            }}
            className="text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-stroke bg-panel/40 p-5 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-fg-muted uppercase tracking-[0.2em] px-1">
              Integrations
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(NODE_TYPES).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addNode(type as keyof typeof NODE_TYPES)}
                  className="w-full flex items-center gap-3 p-3.5 bg-panel/80 border border-stroke rounded-xl hover:border-primary/50 hover:bg-primary/5 transition text-left group shadow-lg shadow-black/20"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {type === "api_call" ? "API" : type === "ai_model" ? "LLM" : label.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-xs font-black text-fg-secondary uppercase tracking-wider">{label}</p>
                    <p className="text-[9px] text-fg-muted font-bold">Click to build</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 relative bg-panel">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            connectionMode={ConnectionMode.Loose}
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-panel !border-stroke !shadow-2xl" />
          </ReactFlow>
        </main>

        <aside className="w-80 border-l border-stroke bg-panel/90 shadow-2xl p-6 overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-8">
              <div className="pb-4 border-b border-stroke">
                <h4 className="text-lg font-black text-fg uppercase tracking-tight">
                  {String((selectedNode.data as any).label)}
                </h4>
                <p className="text-[10px] text-fg-muted font-black uppercase tracking-widest font-mono">
                  ID: {selectedNode.id}
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                  Node Name
                </label>
                <input
                  value={String((selectedNode.data as any).label ?? "")}
                  onChange={(e) => updateNodeConfig(selectedNode.id, { label: e.target.value })}
                  className="w-full bg-panel border border-stroke rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition placeholder:text-fg-muted"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                  Configuration (JSON)
                </label>
                <textarea
                  rows={8}
                  value={JSON.stringify((selectedNode.data as any).config ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateNodeConfig(selectedNode.id, { config: parsed });
                    } catch {
                      // Ignore invalid JSON while the user is typing.
                    }
                  }}
                  className="w-full bg-panel border border-stroke rounded-xl px-4 py-3 text-xs font-mono focus:border-primary outline-none transition custom-scrollbar"
                />
              </div>

              <button
                onClick={() => removeNode(selectedNode.id)}
                className="w-full py-4 border border-rose-900/50 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition"
              >
                Destroy Node
              </button>
            </div>
          ) : (
            <div className="pb-6 border-b border-stroke">
              <h4 className="text-lg font-black text-fg uppercase tracking-tight">Execution</h4>
              <p className="text-[10px] text-fg-muted font-black uppercase tracking-widest font-mono">
                Run and inspect the current workflow graph
              </p>
            </div>
          )}

          <div className="space-y-4 mt-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                Run Input
              </label>
              <textarea
                rows={4}
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                className="w-full bg-panel border border-stroke rounded-xl px-4 py-3 text-sm text-fg focus:border-primary outline-none transition custom-scrollbar"
                placeholder="Workflow input passed into the first node(s)"
              />
              <button
                onClick={handleRun}
                disabled={running || nodes.length === 0}
                className="w-full py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {running ? "Running..." : "Run Workflow"}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">
                  Node Status
                </span>
                {lastRunOrder.length > 0 && (
                  <span className="text-[10px] text-fg-muted font-mono">
                    {lastRunOrder.length} step{lastRunOrder.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {nodes.length === 0 ? (
                <div className="rounded-xl border border-stroke bg-panel/40 p-4 text-sm text-fg-muted">
                  Add nodes to start building a runnable workflow.
                </div>
              ) : (
                <div className="space-y-2">
                  {nodes.map((node) => {
                    const state = executionStates[node.id] ?? EMPTY_NODE_STATE;
                    const statusColor =
                      state.status === "running"
                        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                        : state.status === "success"
                          ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                          : state.status === "failed"
                            ? "text-rose-300 border-rose-500/30 bg-rose-500/10"
                            : "text-fg-muted border-stroke bg-panel/40";

                    return (
                      <div key={node.id} className={`rounded-xl border p-3 ${statusColor}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold truncate">
                            {String((node.data as any).label ?? node.id)}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-black">
                            {state.status}
                          </span>
                        </div>
                        {state.error && (
                          <p className="mt-2 text-[11px] leading-relaxed">{state.error}</p>
                        )}
                        {state.output !== undefined && state.status === "success" && (
                          <GeneratedText
                            text={
                              typeof state.output === "string"
                                ? state.output
                                : JSON.stringify(state.output, null, 2)
                            }
                            className="mt-2 text-[10px] leading-relaxed text-fg"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .react-flow__node {
          border-radius: 12px !important;
          padding: 10px !important;
          min-width: 150px !important;
          background: rgba(15, 23, 42, 0.9) !important;
          border: 2px solid #334155 !important;
          color: #f1f5f9 !important;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5) !important;
        }
        .react-flow__node.selected {
          border-color: #60a5fa !important;
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.4) !important;
        }
        .react-flow__handle {
          width: 8px !important;
          height: 8px !important;
          background: #60a5fa !important;
          border: white 2px solid !important;
        }
      `}</style>
    </div>
  );
};

export default WorkflowEditor;
