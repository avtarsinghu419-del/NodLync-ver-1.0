import { useEffect, useMemo, useRef, useState } from "react";
import {
  createFolder,
  createWorkflow,
  deleteFolderCascade,
  deleteWorkflow,
  folderNameExists,
  listFolders,
  listWorkflows,
  type WorkflowsRow,
} from "../../api/workflowsApi";
import WorkflowReactFlowView from "./WorkflowReactFlowView";

const extractWorkflowName = (parsed: any): string | null => {
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
  // Some exports may nest
  if (parsed.workflow && typeof parsed.workflow.name === "string" && parsed.workflow.name.trim()) {
    return parsed.workflow.name.trim();
  }
  return null;
};

const safePrettyJson = (json: any) => {
  try {
    return JSON.stringify(json, null, 2);
  } catch {
    return String(json ?? "");
  }
};

const downloadTextFile = (fileName: string, text: string, mime = "application/json") => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const stripN8nMeta = (json: any) => {
  if (!json || typeof json !== "object") return json;
  if (Array.isArray(json)) return json;
  const clone: any = { ...json };
  if (clone.__nodlync) delete clone.__nodlync;
  return clone;
};

const getFileNameFromJson = (json: any) => {
  const v = json?.__nodlync?.fileName;
  return typeof v === "string" && v.trim() ? v : "workflow.json";
};

const WorkflowsPanel = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<WorkflowsRow[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowsRow[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  const [viewer, setViewer] = useState<WorkflowsRow | null>(null);
  const [viewerTab, setViewerTab] = useState<"json" | "visual">("json");

  useEffect(() => {
    const load = async () => {
      setLoadingFolders(true);
      setUploadError(null);
      const { data, error } = await listFolders();
      if (error) {
        setUploadError(error.message);
        setFolders([]);
        setSelectedFolderId(null);
        setUploadFolderId(null);
        setLoadingFolders(false);
        return;
      }
      const list = (data ?? []).filter((r) => r.type === "folder");
      setFolders(list);
      const first = list[0]?.id ?? null;
      setSelectedFolderId((prev) => prev ?? first);
      setUploadFolderId((prev) => prev ?? first);
      setLoadingFolders(false);
    };
    void load();
  }, []);

  const refreshCounts = async (folderIds: string[]) => {
    // Simple counts: query workflows for each folder (fast enough for small sets)
    const counts: Record<string, number> = {};
    await Promise.all(
      folderIds.map(async (fid) => {
        const { data } = await listWorkflows(fid);
        counts[fid] = (data ?? []).length;
      })
    );
    setFolderCounts(counts);
  };

  const refreshWorkflows = async (folderId: string | null) => {
    if (!folderId) {
      setWorkflows([]);
      return;
    }
    setLoadingWorkflows(true);
    const { data, error } = await listWorkflows(folderId);
    if (error) {
      setUploadError(error.message);
      setWorkflows([]);
      setLoadingWorkflows(false);
      return;
    }
    setWorkflows(data ?? []);
    setLoadingWorkflows(false);
  };

  useEffect(() => {
    void refreshWorkflows(selectedFolderId);
  }, [selectedFolderId]);

  useEffect(() => {
    if (folders.length) void refreshCounts(folders.map((f) => f.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.length]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const handleCreateFolder = () => {
    const run = async () => {
      const name = newFolderName.trim();
      if (!name) return;
      setUploadError(null);
      const exists = await folderNameExists(name);
      if (exists) {
        setUploadError("Folder name already exists.");
        return;
      }
      const { data, error } = await createFolder(name);
      if (error) {
        setUploadError(error.message);
        return;
      }
      if (data) {
        setFolders((prev) => [...prev, data]);
        setNewFolderName("");
        setSelectedFolderId(data.id);
        setUploadFolderId(data.id);
        setFolderCounts((prev) => ({ ...prev, [data.id]: 0 }));
      }
    };
    void run();
  };

  const handleDeleteWorkflow = (id: string) => {
    const run = async () => {
      await deleteWorkflow(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      if (selectedFolderId) {
        setFolderCounts((prev) => ({
          ...prev,
          [selectedFolderId]: Math.max(0, (prev[selectedFolderId] ?? 0) - 1),
        }));
      }
    };
    void run();
    if (viewer?.id === id) setViewer(null);
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const folderId = uploadFolderId ?? selectedFolderId;
    if (!folderId) {
      setUploadError("Create or select a folder first.");
      return;
    }

    const list = Array.from(files);
    if (list.length === 0) return;

    // Validate types
    const invalid = list.filter((f) => !f.name.toLowerCase().endsWith(".json"));
    if (invalid.length) {
      setUploadError("Only .json files are allowed.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const invalidFiles: string[] = [];
      const created: WorkflowsRow[] = [];
      for (const file of list) {
        const text = await file.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (e: any) {
          invalidFiles.push(`${file.name}: ${e?.message || "Invalid JSON"}`);
          continue;
        }

        const workflowName = extractWorkflowName(parsed) ?? file.name.replace(/\.json$/i, "");
        const json_data = {
          ...parsed,
          __nodlync: {
            fileName: file.name,
            importedAt: new Date().toISOString(),
          },
        };

        const { data, error } = await createWorkflow({
          name: workflowName,
          parent_id: folderId,
          json_data,
        });
        if (error) {
          invalidFiles.push(`${file.name}: ${error.message}`);
          continue;
        }
        if (data) created.push(data);
      }

      if (invalidFiles.length) {
        setUploadError(`Some files were skipped:\n${invalidFiles.join("\n")}`);
      }

      if (created.length) {
        // If currently viewing this folder, prepend
        if (selectedFolderId === folderId) {
          setWorkflows((prev) => [...created, ...prev]);
        }
        setFolderCounts((prev) => ({
          ...prev,
          [folderId]: (prev[folderId] ?? 0) + created.length,
        }));
      }

      setSelectedFolderId(folderId);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
      {/* Sidebar: folders */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">Folder</span>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">
              Workflows
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Upload and organize n8n workflow exports (.json) in Supabase.
          </p>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-surface border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              title="Create folder"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loadingFolders ? (
            <div className="p-4 text-sm text-slate-500">Loading folders...</div>
          ) : folders.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              No folders yet. Create one above.
            </div>
          ) : (
            folders.map((f) => {
              const active = f.id === selectedFolderId;
              const count = folderCounts[f.id] ?? 0;
              return (
                <div
                  key={f.id}
                  className={`group w-full px-3 py-2.5 rounded-lg border transition flex items-center justify-between gap-3 ${
                    active
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-surface/30 border-slate-800 text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(f.id)}
                    className="flex-1 text-left min-w-0"
                    title={f.name}
                  >
                    <span className="font-medium truncate block">{f.name}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">{count}</span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition"
                      title="Delete folder (and all workflows inside)"
                      onClick={() => {
                        const ok = window.confirm(
                          `Delete folder "${f.name}" and all workflows inside?`
                        );
                        if (!ok) return;
                        const run = async () => {
                          const { error } = await deleteFolderCascade(f.id);
                          if (error) {
                            setUploadError(error.message);
                            return;
                          }
                          setFolders((prev) => prev.filter((x) => x.id !== f.id));
                          setFolderCounts((prev) => {
                            const next = { ...prev };
                            delete next[f.id];
                            return next;
                          });
                          if (selectedFolderId === f.id) {
                            const remaining = folders.filter((x) => x.id !== f.id);
                            const nextId = remaining[0]?.id ?? null;
                            setSelectedFolderId(nextId);
                            setUploadFolderId(nextId);
                            setWorkflows([]);
                          }
                        };
                        void run();
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main: upload + list */}
      <div className="glass-panel flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 truncate">
              {selectedFolder ? selectedFolder.name : "All Workflows"}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Upload single or multiple n8n exports. We’ll extract the workflow name when possible.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              value={uploadFolderId ?? ""}
              onChange={(e) => setUploadFolderId(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void handleUploadFiles(e.target.files);
                }}
              />
              <button
                type="button"
                className={`btn-primary px-4 py-2 text-sm ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || folders.length === 0}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>

        {uploadError ? (
          <div className="px-5 pt-4">
            <div className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
              {uploadError}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {loadingWorkflows ? (
            <div className="p-8 text-sm text-slate-500">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="glass-panel p-10 text-center text-slate-500 border-dashed">
              {selectedFolderId
                ? "No workflows in this folder yet. Upload one or more `.json` exports to get started."
                : "Create or select a folder to start uploading workflows."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-surface/20">
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {workflows.map((w) => {
                    const fileName = getFileNameFromJson(w.json_data);
                    const isInvalid = !w.json_data;
                    const jsonWithoutMeta = stripN8nMeta(w.json_data);
                    return (
                      <div
                        key={w.id}
                        className="glass-panel p-4 flex flex-col gap-3 rounded-xl border border-slate-800/60 bg-slate-950/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                              {w.name || "Unnamed workflow"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Added {new Date(w.created_at).toLocaleString()}
                            </p>
                          </div>
                          {isInvalid ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-200">
                              Invalid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                              Ready
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="text-sm text-slate-300 font-mono truncate"
                            title={fileName}
                          >
                            {fileName}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mt-auto">
                          <button
                            type="button"
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => {
                              setViewer(w);
                              setViewerTab("json");
                            }}
                          >
                            View
                          </button>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1.5 text-xs"
                              onClick={() =>
                                downloadTextFile(
                                  fileName,
                                  JSON.stringify(jsonWithoutMeta ?? {}, null, 2)
                                )
                              }
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10"
                              onClick={() => {
                                const ok = window.confirm(
                                  `Delete "${fileName}" from this folder?`
                                );
                                if (ok) handleDeleteWorkflow(w.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer modal */}
      {viewer ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-400">Workflow</p>
                <p className="text-lg font-semibold text-slate-100 truncate">
                  {viewer.name || "Unnamed workflow"}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {getFileNameFromJson(viewer.json_data)}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => setViewer(null)}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="inline-flex rounded-lg bg-slate-900/70 border border-slate-800 text-xs overflow-hidden">
                <button
                  type="button"
                  className={`px-4 py-2 border-r border-slate-800 ${
                    viewerTab === "json"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setViewerTab("json")}
                >
                  JSON View
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${
                    viewerTab === "visual"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  onClick={() => setViewerTab("visual")}
                >
                  Visual View
                </button>
              </div>

              {viewerTab === "json" ? (
                <pre className="rounded-xl border border-slate-800 bg-slate-950/70 max-h-[65vh] overflow-auto text-xs font-mono text-slate-100 px-4 py-3 whitespace-pre-wrap break-words">
                  {safePrettyJson(stripN8nMeta(viewer.json_data ?? {}))}
                </pre>
              ) : (
                <div>
                  {viewer.json_data ? (
                    <WorkflowReactFlowView workflowJson={stripN8nMeta(viewer.json_data)} />
                  ) : (
                    <div className="text-sm text-slate-500 p-6">
                      Visual view not available.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowsPanel;
