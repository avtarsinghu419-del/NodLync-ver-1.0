import { useCallback, useState, useEffect } from 'react';
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
  type OnNodesChange, 
  type OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getWorkflowData, saveWorkflowData } from '../../api/workflowEditorApi';
import InlineSpinner from '../../components/InlineSpinner';

// ── Custom Node Types (Simplified for now) ──
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

const WorkflowEditor = ({ workflowId, onClose }: Props) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 1. Load Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await getWorkflowData(workflowId);
      if (data) {
        setNodes((data.nodes || []).map(n => ({
          id: n.id,
          type: 'default', // Using default for now, can extend to custom
          position: { x: n.position_x, y: n.position_y },
          data: { label: n.label, config: n.config, type: n.type },
        })));
        setEdges((data.edges || []).map(e => ({
          id: e.id,
          source: e.source_node_id,
          target: e.target_node_id,
          sourceHandle: e.source_handle,
          targetHandle: e.target_handle,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
          style: { stroke: '#60a5fa', strokeWidth: 2 },
        })));
      }
      setLoading(false);
    };
    void load();
  }, [workflowId]);

  // 2. State Management
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
        ...params, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#60a5fa', strokeWidth: 2 } 
    }, eds)),
    []
  );

  // 3. Save Logic
  const handleSave = async () => {
    setSaving(true);
    await saveWorkflowData(workflowId, nodes, edges);
    setSaving(false);
  };

  const addNode = (type: keyof typeof NODE_TYPES) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position: { x: 100, y: 100 },
      data: { 
        label: NODE_TYPES[type], 
        type, 
        config: type === 'api_call' ? { url: '', method: 'GET' } : {} 
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeConfig = (nodeId: string, updates: any) => {
     setNodes((nds) => nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, ...updates } };
        }
        return n;
     }));
     // Sync selected node as well
     if (selectedNode?.id === nodeId) {
        setSelectedNode((prev: any) => {
           if (!prev) return null;
           return { ...prev, data: { ...prev.data, ...updates } };
        });
     }
  };

  if (loading) return <div className="h-full flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"><InlineSpinner /></div>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden font-sans">
      {/* ── Header ── */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 font-bold">← EXIT</button>
          <div className="h-6 w-px bg-slate-800" />
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest">Workflow Studio</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 text-xs font-black tracking-widest uppercase">
            {saving ? <InlineSpinner /> : "DEPLOY & SAVE"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Node Library ── */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-5 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Integrations</h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(NODE_TYPES).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addNode(type as any)}
                  className="w-full flex items-center gap-3 p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group shadow-lg shadow-black/20"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{type === 'api_call' ? '🌐' : type === 'ai_model' ? '🧠' : type === 'condition' ? '⚖️' : type === 'delay' ? '⏳' : '🔧'}</span>
                  <div>
                    <p className="text-xs font-black text-slate-200 uppercase tracking-wider">{label}</p>
                    <p className="text-[9px] text-slate-600 font-bold">Click to build</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER: Canvas ── */}
        <main className="flex-1 relative bg-slate-950">
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
            <Controls className="!bg-slate-900 !border-slate-800 !shadow-2xl" />
          </ReactFlow>
        </main>

        {/* ── RIGHT: Config Panel ── */}
        <aside className={`w-80 border-l border-slate-800 bg-slate-950/90 shadow-2xl transition-all duration-300 transform p-6 overflow-y-auto ${selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
          {selectedNode ? (
            <div className="space-y-8 animate-in slide-in-from-right-10 duration-300">
               <div className="pb-4 border-b border-slate-800">
                  <h4 className="text-lg font-black text-slate-100 uppercase tracking-tight">{selectedNode.data.label}</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">ID: {selectedNode.id}</p>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Name</label>
                  <input
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { label: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all placeholder:text-slate-700"
                  />
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuration (JSON)</label>
                  <textarea
                    rows={8}
                    value={JSON.stringify(selectedNode.data.config, null, 2)}
                    onChange={(e) => {
                       try {
                          const parsed = JSON.parse(e.target.value);
                          updateNodeConfig(selectedNode.id, { config: parsed });
                       } catch { /* Suppress invalid JSON while typing */ }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:border-primary outline-none transition-all custom-scrollbar"
                  />
                  <p className="text-[9px] text-slate-600 font-bold px-1 italic">Note: JSON updates are applied instantly if valid.</p>
               </div>
               
               <button 
                  onClick={() => {
                     setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                     setSelectedNode(null);
                  }}
                  className="w-full py-4 border border-rose-900/50 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all"
                >
                  Destroy Node
               </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
               <span className="text-4xl mb-4">⚙️</span>
               <p className="text-xs font-bold uppercase tracking-widest">Select a node to configure</p>
            </div>
          )}
        </aside>
      </div>

       {/* Styles for nodes (Global in index.css would be better but keeping contained) */}
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
