import { useState, useEffect, useRef } from "react";
import ModuleHeader from "../../components/ModuleHeader";
import { 
  listWorkflowsV2, 
  createWorkflowV2, 
  deleteWorkflowV2, 
  type WorkflowV2 
} from "../../api/workflowEditorApi";
import WorkflowEditor from "./WorkflowEditor";
import WorkflowReactFlowView from "./WorkflowReactFlowView";
import InlineSpinner from "../../components/InlineSpinner";
import useAppStore from "../../store/useAppStore";

const WorkflowsPanel = () => {
  const { user } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workflows, setWorkflows] = useState<WorkflowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingJson, setViewingJson] = useState<WorkflowV2 | null>(null);
  
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");

  useEffect(() => {
    if (user) void refreshWorkflows();
  }, [user]);

  const refreshWorkflows = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await listWorkflowsV2(user.id);
    if (data) setWorkflows(data);
    setLoading(false);
  };

  const handleCreateVisual = async () => {
    if (!user) return;
    const { data } = await createWorkflowV2({
      name: newWorkflowName.trim() || "New Visual Automation",
      user_id: user.id,
      workflow_type: 'visual'
    });
    if (data) {
      setWorkflows(prev => [data, ...prev]);
      setEditingId(data.id);
      setNewWorkflowName("");
      setShowCreateMenu(false);
    }
  };

  const handleImportJson = async (files: FileList) => {
    if (!user) return;
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const { data } = await createWorkflowV2({
          name: file.name.replace(".json", ""),
          user_id: user.id,
          workflow_type: 'imported',
          json_data: parsed
        });
        if (data) setWorkflows(prev => [data, ...prev]);
      } catch (err) { console.error("Import failed:", err); }
    }
    setShowCreateMenu(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this automation?")) return;
    await deleteWorkflowV2(id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
  };

  if (editingId) {
    return (
      <WorkflowEditor 
        workflowId={editingId} 
        onClose={() => {
           setEditingId(null);
           void refreshWorkflows();
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/20 overflow-hidden">
      <ModuleHeader 
        title="Automations" 
        description="NODE ENGINE" 
        icon="⚡"
      >
        <div className="relative">
           <button 
             onClick={() => setShowCreateMenu(!showCreateMenu)}
             className="px-8 py-3 bg-primary text-slate-900 font-black tracking-widest uppercase text-[10px] rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
           >
              Create Flow <span className={showCreateMenu ? 'rotate-180 transition-transform' : 'transition-transform'}>▼</span>
           </button>

           {showCreateMenu && (
             <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Flow Identity</label>
                      <input 
                        value={newWorkflowName}
                        onChange={(e) => setNewWorkflowName(e.target.value)}
                        placeholder="Automation Name..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-700"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateVisual()}
                      />
                   </div>
                   <div className="h-px bg-slate-800" />
                   <button 
                     onClick={handleCreateVisual}
                     className="w-full text-left p-3 rounded-xl hover:bg-primary/10 group transition-all"
                   >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-primary tracking-tight">◈ Empty Visual Canvas</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">Start from scratch</p>
                   </button>
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full text-left p-3 rounded-xl hover:bg-primary/10 group transition-all"
                   >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-primary tracking-tight">⊞ Import JSON File</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">n8n or custom exports</p>
                   </button>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => e.target.files && handleImportJson(e.target.files)} />
                </div>
             </div>
           )}
        </div>
      </ModuleHeader>

      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-7xl mx-auto">
            {loading && workflows.length === 0 ? (
               <div className="p-20 flex justify-center"><InlineSpinner /></div>
            ) : workflows.length === 0 ? (
               <div className="p-20 border-2 border-dashed border-slate-800 rounded-3xl text-center space-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 group">
                  <span className="text-5xl block group-hover:scale-110 transition-transform">🤖</span>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Deploy your first logic engine above.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {workflows.map(wf => (
                     <div key={wf.id} className="glass-panel p-0 overflow-hidden relative group hover:border-primary/40 transition-all group shadow-2xl shadow-black/40 bg-slate-950/20">
                        {/* Header Section */}
                        <div className="p-6 border-b border-slate-900 bg-slate-900/10">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{wf.workflow_type === 'visual' ? '◈' : '⊞'}</span>
                              <button onClick={() => handleDelete(wf.id)} className="p-1 px-2.5 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 rounded-xl text-rose-500/50 hover:text-rose-500 transition-all text-xs">🗑️</button>
                           </div>
                           <h4 className="text-base font-black text-slate-100 tracking-tighter truncate uppercase">{wf.name}</h4>
                           <p className="text-[10px] text-slate-500 font-black tracking-widest mt-1">ENGINE VERSION 2.0</p>
                        </div>

                        {/* Status/Type Area */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-black/20">
                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Node Cluster</span>
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${wf.workflow_type === 'visual' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-700 bg-slate-800/50 text-slate-400'}`}>
                              {wf.workflow_type || 'visual'}
                           </span>
                        </div>

                        {/* Action Buttons (The Unified Option) */}
                        <div className="p-3 grid grid-cols-2 gap-2 bg-slate-950/40">
                           <button 
                             onClick={() => setEditingId(wf.id)}
                             className="flex flex-col items-center justify-center p-4 bg-slate-900 hover:bg-primary group/btn rounded-xl border border-slate-800 transition-all shadow-lg hover:shadow-primary/20"
                           >
                              <span className="text-lg group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all">🏗️</span>
                              <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-slate-400 group-hover/btn:text-slate-900">Visual Edit</span>
                           </button>
                           <button 
                             onClick={() => setViewingJson(wf)}
                             className="flex flex-col items-center justify-center p-4 bg-slate-900 hover:bg-slate-800 group/btn rounded-xl border border-slate-800 transition-all hover:border-slate-500"
                           >
                              <span className="text-lg group-hover/btn:scale-110 transition-all">📄</span>
                              <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-slate-400 group-hover/btn:text-slate-200">Raw JSON</span>
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </main>

      {/* Unified JSON Previewer */}
      {viewingJson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-300">
           <div className="w-full max-w-6xl h-[85vh] bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
              <div className="p-8 border-b border-slate-900 flex items-center justify-between bg-slate-900/20">
                 <div>
                    <h3 className="text-xl font-black text-slate-100 tracking-tighter uppercase">{viewingJson.name}</h3>
                    <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mt-1">Source Logic & Metadata</p>
                 </div>
                 <button onClick={() => setViewingJson(null)} className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-black hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest tracking-widest text-slate-400 hover:text-slate-100">✕ CLOSE</button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] overflow-hidden">
                 {/* Visual Preview (Read Only) */}
                 <div className="border-r border-slate-900 bg-slate-950 p-6">
                    <div className="h-full rounded-2xl border border-slate-800/50 bg-slate-900/10 overflow-hidden">
                       <WorkflowReactFlowView workflowJson={viewingJson.json_data || {}} />
                    </div>
                 </div>

                 {/* JSON Code Area */}
                 <div className="flex flex-col bg-slate-950/50 overflow-hidden">
                    <div className="p-4 border-b border-slate-900 flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Raw Application Logic</span>
                       <button 
                         onClick={() => {
                            const blob = new Blob([JSON.stringify(viewingJson.json_data || {}, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${viewingJson.name}.json`;
                            a.click();
                         }}
                         className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest px-2"
                       >
                          Download Script
                       </button>
                    </div>
                    <pre className="flex-1 p-8 text-[11px] font-mono text-slate-400 overflow-auto custom-scrollbar leading-relaxed">
                       {JSON.stringify(viewingJson.json_data || {}, null, 2)}
                    </pre>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPanel;
