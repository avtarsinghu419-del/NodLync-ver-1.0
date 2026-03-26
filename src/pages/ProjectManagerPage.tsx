import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { getProjects } from "../api/projectsApi";
import { supabase } from "../api/supabaseClient";
import { getMilestones, createMilestone, updateMilestone, deleteMilestone, type Milestone } from "../api/milestonesApi";
import { getTaskItems, createTaskItem, updateTaskItem, deleteTaskItem, type TaskItem } from "../api/tasksApi";
import { getProjectLogs, getAllProjectLogs, getProjectLogsPage, createProjectLog, type ProjectLog } from "../api/logsApi";
import { createProjectReport } from "../api/reportsApi";
import { createUserItem } from "../api/userItemsApi";
import InlineSpinner from "../components/InlineSpinner";
import ProjectHeader from "../modules/projects/manager/ProjectHeader";
import ProjectTabs, { type TabId } from "../modules/projects/manager/ProjectTabs";
import MilestonesCard from "../modules/projects/manager/MilestonesCard";
import TasksPanel from "../modules/projects/manager/TasksPanel";
import TeamCard, { type ProjectRole } from "../modules/projects/manager/TeamCard";
import TeamMembersOverview from "../modules/projects/manager/TeamMembersOverview";
import WorkLogCard from "../modules/projects/manager/WorkLogCard";
import ReportsCard from "../modules/projects/manager/ReportsCard";
import useAppStore from "../store/useAppStore";
import type { Project } from "../types";
import { formatDateTime } from "../utils/format";
import { useMembers } from "../hooks/useMembers";
import { getErrorMessage } from "../utils/errors";
import { logAppEvent } from "../utils/appLogger";

const PROJECT_TABS: TabId[] = ["overview", "milestones", "tasks", "reports", "team", "history"];

function isTabId(value: string | null): value is TabId {
  return value !== null && PROJECT_TABS.includes(value as TabId);
}

const HistoryList = ({
  project,
  logs,
  page,
  pageSize,
  total,
  onPageChange,
  onDeleteSelected,
  onExportSelected,
}: {
  project: Project;
  logs: ProjectLog[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => Promise<void>;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onExportSelected: (ids: string[]) => void;
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const ids = logs.map((l) => l.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clear = () => setSelected(new Set());

  const selectedIds = Array.from(selected);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="glass-panel p-3 flex items-center justify-between">
          <div className="text-xs text-fg-muted">
            {selectedIds.length} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => onExportSelected(selectedIds)}
            >
              Export Selected
            </button>
            <button
              className="btn-ghost text-xs text-rose-400 hover:text-rose-300"
              onClick={async () => {
                if (!window.confirm(`Delete ${selectedIds.length} selected log(s)?`)) return;
                await onDeleteSelected(selectedIds);
                clear();
              }}
            >
              Delete Selected
            </button>
            <button className="btn-ghost text-xs" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel divide-y divide-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.18em] text-fg-muted">
          <input
            type="checkbox"
            checked={logs.length > 0 && logs.every((l) => selected.has(l.id))}
            onChange={togglePage}
            className="h-4 w-4 accent-primary"
            aria-label="Select all visible logs"
          />
          <span>Visible logs</span>
        </div>
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(log.id)}
                  onChange={() => toggleOne(log.id)}
                  className="h-4 w-4 accent-primary"
                  aria-label={`Select log ${log.created_at}`}
                />
                <span className="text-xs text-fg-muted font-mono">
                  {formatDateTime(log.created_at)}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Completed</div>
                <div className="text-sm text-fg-secondary whitespace-pre-wrap">{log.completed_work || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-400 uppercase font-bold mb-1">Next Steps</div>
                <div className="text-sm text-fg-secondary whitespace-pre-wrap">{log.next_steps || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-400 uppercase font-bold mb-1">Blockers</div>
                <div className="text-sm text-fg-secondary whitespace-pre-wrap">{log.blockers || ""}</div>
              </div>
              <div>
                <div className="text-[10px] text-fg-muted uppercase font-bold mb-1">Notes</div>
                <div className="text-sm text-fg-secondary whitespace-pre-wrap">{log.notes || ""}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4 flex items-center justify-between">
        <div className="text-xs text-fg-muted">
          Showing {startItem}-{endItem} of {total} for {project.name}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span className="text-xs text-fg-muted font-mono">
            {page}/{totalPages}
          </span>
          <button
            className="btn-ghost text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const OverviewTab = ({
  project,
  milestones,
  logs,
  onLogSubmit,
  workLogDraft,
  onWorkLogDraftChange,
  userId,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  currentMemberRole,
  onAddRedirect,
}: {
  project: Project;
  milestones: Milestone[];
  logs: ProjectLog[];
  onLogSubmit: (payload: any) => Promise<void>;
  workLogDraft: {
    completed: string;
    next_steps: string;
    blockers: string;
    notes: string;
  };
  onWorkLogDraftChange: (next: {
    completed: string;
    next_steps: string;
    blockers: string;
    notes: string;
  }) => void;
  userId: string;
  onAddMilestone: (payload: { title: string; deadline?: string | null }) => Promise<void>;
  onUpdateMilestone: (m: any) => Promise<void>;
  onDeleteMilestone: (id: string) => Promise<void>;
  currentMemberRole: ProjectRole;
  onAddRedirect: () => void;
}) => {
  const { members, loading } = useMembers(project.id);
  const teamMembers = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        display_name: member.user_profiles?.display_name || "Member",
        avatar_url: member.user_profiles?.avatar_url,
        email: (member as any).user_profiles?.email,
        role: member.role as ProjectRole,
      })),
    [members]
  );
  const lastCompletedMilestone = [...milestones].reverse().find(m => m.status === 'completed');
  const inProgressMilestone = milestones.find(m => m.status === 'in_progress');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-6">
      <div className="space-y-6">
        {/* Recent Milestones */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-fg-muted uppercase tracking-wider mb-4">Milestone Pulse</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-panel/40 p-4 rounded-xl border border-stroke/50">
              <p className="text-[10px] text-fg-muted uppercase font-bold mb-1">Last Completed</p>
              <p className="text-fg-secondary font-medium">{lastCompletedMilestone?.title || "No milestones completed yet"}</p>
            </div>
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] text-primary/70 uppercase font-bold mb-1 font-mono">Current Phase</p>
              <p className="text-primary font-semibold">{inProgressMilestone?.title || "No milestone in progress"}</p>
            </div>
          </div>
        </div>

        {/* Daily Log Input */}
        <WorkLogCard
          onSubmit={onLogSubmit}
          value={workLogDraft}
          onChange={onWorkLogDraftChange}
        />

        {/* Recent Work Logs (Last 5 days approx) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-fg-muted uppercase tracking-wider">Recent Activity Logs</h3>
            <span className="text-[10px] text-fg-muted font-mono">Last {logs.length} entries</span>
          </div>
          {logs.length === 0 ? (
            <div className="glass-panel p-8 text-center text-fg-muted text-sm">No work logs recorded yet.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="glass-panel p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-stroke pb-2">
                  <span className="text-xs font-bold text-primary">Team Member</span>
                  <span className="text-[10px] text-fg-muted font-mono">{formatDateTime(log.created_at)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Completed</h4>
                    <p className="text-sm text-fg-secondary leading-relaxed">{log.completed_work}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-amber-400 uppercase font-bold mb-1">Next Steps</h4>
                    <p className="text-sm text-fg-secondary leading-relaxed">{log.next_steps}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-rose-400 uppercase font-bold mb-1">Blockers</h4>
                    <p className="text-sm text-fg-secondary leading-relaxed">{log.blockers || <span className="italic opacity-30">None</span>}</p>
                  </div>
                </div>
                {log.notes && (
                  <div className="pt-2 border-t border-stroke/50">
                    <p className="text-xs text-fg-muted italic">{log.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <MilestonesCard
         milestones={milestones.map(m => ({ ...m, item_type: 'milestone' } as any))}
         projectId={project.id}
         userId={userId}
         onAdd={onAddMilestone}
         onToggle={(m: any) => onUpdateMilestone({ ...m, status: m.status === 'completed' ? 'in_progress' : 'completed' })}
         onDelete={onDeleteMilestone}
         onBulkDelete={async (ids) => { for(const mid of ids) await onDeleteMilestone(mid); }}
        />
        <TeamMembersOverview members={teamMembers} loading={loading} onOpenTeamTab={onAddRedirect} />
        <div className="glass-panel p-6 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fg-muted">
            Your Access
          </p>
          <p className="text-sm text-fg-secondary">
            You are currently working in this project as{" "}
            <span className="font-bold text-primary">{currentMemberRole}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

const ProjectTeamTab = ({
  project,
  currentMemberRole,
  currentUserId,
}: {
  project: Project;
  currentMemberRole: ProjectRole;
  currentUserId: string;
}) => {
  const {
    members,
    loading,
    addMember,
    updateRole,
    deleteMember,
    searchUsers,
  } = useMembers(project.id);

  const teamMembers = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        display_name: member.user_profiles?.display_name || "Member",
        avatar_url: member.user_profiles?.avatar_url,
        email: (member as any).user_profiles?.email,
        role: member.role as any,
      })),
    [members]
  );

  const canManage =
    currentUserId === project.user_id ||
    currentMemberRole === "owner" ||
    currentMemberRole === "admin";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center">
        <InlineSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <TeamCard
        members={teamMembers}
        canManage={canManage}
        onAdd={async (uid, role) => {
          await addMember({ user_id: uid, role });
        }}
        onUpdateRole={async (id, role) => {
          await updateRole({ id, role });
        }}
        onRemove={async (id) => {
          await deleteMember(id);
        }}
        onSearch={searchUsers}
      />
    </div>
  );
};

const ProjectManagerPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const user = useAppStore((state) => state.user);
  const userId = user?.id ?? null;

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const initialTab = new URLSearchParams(location.search).get("tab");
    return isTabId(initialTab) ? initialTab : "overview";
  });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyLogs, setHistoryLogs] = useState<ProjectLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);
  const [savingToStuff, setSavingToStuff] = useState(false);
  const [workLogDraft, setWorkLogDraft] = useState({
    completed: "",
    next_steps: "",
    blockers: "",
    notes: "",
  });

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`worklog-draft-${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWorkLogDraft({
          completed: parsed.completed ?? "",
          next_steps: parsed.next_steps ?? "",
          blockers: parsed.blockers ?? "",
          notes: parsed.notes ?? "",
        });
      } catch {
        // ignore malformed
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`worklog-draft-${id}`, JSON.stringify(workLogDraft));
  }, [id, workLogDraft]);

  const currentMemberRole = useMemo(() => {
    if (project?.user_id === user?.id) return "owner";
    return (project?.access_role as ProjectRole) || "viewer";
  }, [project, user]);

  const milestoneItems = useMemo(
    () => milestones.map((milestone) => ({ ...milestone, item_type: "milestone" } as any)),
    [milestones]
  );
  const lastHistoryRequestRef = useRef<{ page: number; tab: TabId } | null>(null);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get("tab");
    if (isTabId(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search, activeTab]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set("tab", tab);
        return nextParams;
      });
    },
    [activeTab, setSearchParams]
  );

  const loadAll = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    setPageError(null);
    try {
      const [pRes, mRes, tRes, lRes] = await Promise.all([
        getProjects(userId),
        getMilestones(id),
        getTaskItems(id),
        getProjectLogs(id),
      ]);

      if (pRes.error) throw new Error(pRes.error.message);
      if (mRes.error) throw new Error(mRes.error.message);
      if (tRes.error) throw new Error(tRes.error.message);
      if (lRes.error) throw new Error(lRes.error.message);

      const foundProject = (pRes.data ?? []).find((projectItem) => projectItem.id === id) ?? null;
      if (!foundProject) {
        setProject(null);
        setPageError("Project not found, or you no longer have access to it.");
        return;
      }

      setProject(foundProject);
      setMilestones(mRes.data || []);
      setTasks(tRes.data || []);
      setLogs(lRes.data || []);
    } catch (err: any) {
      console.error("Load failed", err);
      setProject(null);
      setPageError(err?.message ?? "Failed to load the project.");
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadHistory = useCallback(async (page: number) => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await getProjectLogsPage(id, page, historyPageSize);
      if (res.error) throw res.error;
      setHistoryLogs(res.data?.logs || []);
      setHistoryTotal(res.data?.total || 0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPageSize, id]);

  useEffect(() => {
    if (activeTab !== "history") {
      lastHistoryRequestRef.current = null;
      return;
    }

    if (historyPage !== 1) {
      setHistoryPage(1);
      return;
    }

    const lastRequest = lastHistoryRequestRef.current;
    if (lastRequest?.tab === "history" && lastRequest.page === historyPage) return;

    lastHistoryRequestRef.current = { page: historyPage, tab: "history" };
    void loadHistory(historyPage);
  }, [activeTab, historyPage, loadHistory]);

  const handleManualRefresh = useCallback(async () => {
    setManualRefreshPending(true);
    try {
      await loadAll();
      if (activeTab === "history") {
        await loadHistory(historyPage);
      }
    } finally {
      setManualRefreshPending(false);
    }
  }, [activeTab, historyPage, loadAll, loadHistory]);

  const handleLogSubmit = async (payload: any) => {
    if (!project || !user) return;
    const insertPayload = {
      project_id: project.id,
      user_id: user.id,
      completed_work: payload.completed,
      next_steps: payload.next_steps,
      blockers: payload.blockers,
      notes: payload.notes,
    };
    await createProjectLog(insertPayload);
    const updatedLogs = await getProjectLogs(project.id);
    if (updatedLogs.error) throw updatedLogs.error;
    setLogs(updatedLogs.data || []);
    setWorkLogDraft({ completed: "", next_steps: "", blockers: "", notes: "" });
    if (activeTab === "history") await loadHistory(historyPage);
  };

  const handleAddMilestone = async (payload: { title: string; deadline?: string | null }) => {
    if (!project || !user) return;
    const { data } = await createMilestone({
      project_id: project.id,
      user_id: user.id,
      title: payload.title,
      deadline: payload.deadline ? payload.deadline : null,
      status: 'not_started'
    });
    if (data) setMilestones(prev => [...prev, data]);
  };

  const handleUpdateMilestone = async (m: any) => {
    const updatePayload: Partial<Milestone> = { title: m.title, status: m.status };
    const response = await updateMilestone(m.id, updatePayload);
    if ((response as any).error) throw (response as any).error;
    const { data } = response as any;
    if (data) setMilestones(prev => prev.map(item => item.id === data.id ? (data as Milestone) : item));
  };

  const handleDeleteMilestone = async (mid: string) => {
    await deleteMilestone(mid);
    setMilestones(prev => prev.filter(m => m.id !== mid));
  };

  const handleAddTask = async (payload: { title: string; deadline?: string | null }, milestoneId: string) => {
    if (!project || !user) return;
    const insertPayload = {
      project_id: project.id,
      milestone_id: milestoneId,
      title: payload.title,
      status: "not_done",
      is_completed: false,
      priority: "medium",
      deadline: payload.deadline ? payload.deadline : null,
    };
    const response = await createTaskItem(insertPayload as any);
    if ((response as any).error) throw (response as any).error;
    const updatedTasks = await getTaskItems(project.id);
    if (updatedTasks.error) throw updatedTasks.error;
    setTasks(updatedTasks.data || []);
  };

  const handleUpdateTask = async (tid: string, payload: any) => {
    const response = await updateTaskItem(tid, payload);
    if ((response as any).error) throw (response as any).error;
    const updatedTasks = await getTaskItems(project?.id ?? "");
    if (updatedTasks.error) throw updatedTasks.error;
    setTasks(updatedTasks.data || []);
  };

  const handleDeleteTask = async (tid: string) => {
    const response = await deleteTaskItem(tid);
    if ((response as any).error) throw (response as any).error;
    const updatedTasks = await getTaskItems(project?.id ?? "");
    if (updatedTasks.error) throw updatedTasks.error;
    setTasks(updatedTasks.data || []);
  };

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const renderTab = () => {
    if (!project || !user) return null;

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            project={project}
            milestones={milestones}
            logs={logs}
            onLogSubmit={handleLogSubmit}
            workLogDraft={workLogDraft}
            onWorkLogDraftChange={setWorkLogDraft}
            userId={user.id}
            onAddMilestone={handleAddMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            currentMemberRole={currentMemberRole}
            onAddRedirect={() => handleTabChange("team")}
          />
        );
      case "milestones":
        return (
          <div className="max-w-4xl mx-auto">
             <MilestonesCard
                milestones={milestoneItems}
                projectId={project.id}
                userId={user.id}
                onAdd={handleAddMilestone}
                onToggle={(m: any) => handleUpdateMilestone({ ...m, status: m.status === 'completed' ? 'in_progress' : 'completed' })}
                onDelete={handleDeleteMilestone}
                onBulkDelete={async (ids) => { for(const mid of ids) await deleteMilestone(mid); setMilestones(prev => prev.filter(m => !ids.includes(m.id))); }}
             />
          </div>
        );
      case "tasks":
        if (milestones.length === 0) {
          return (
            <div className="max-w-3xl mx-auto py-24 flex flex-col items-center justify-center text-center space-y-6">
               <div className="w-20 h-20 bg-panel rounded-3xl flex items-center justify-center border border-stroke text-3xl shadow-xl">🔒</div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold text-fg italic">Project Structure Required</h3>
                  <p className="text-fg-muted max-w-sm">Tasks must be linked to a strategic milestone. Create your first milestone to unlock this project stream.</p>
               </div>
                <button 
                onClick={() => handleTabChange('milestones')}
                className="btn-primary py-3 px-8 font-bold text-sm tracking-wide"
               >
                  Go to Milestones →
               </button>
            </div>
          );
        }
        return (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-bold text-fg-muted uppercase tracking-widest">{milestones.length} Milestone Tracks</h3>
                 <span className="text-[10px] text-primary font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Unlocked</span>
            </div>
            {milestones.map(m => (
                <div key={m.id} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`} />
                      <h3 className="font-bold text-fg-secondary">{m.title}</h3>
                    </div>
                    <span className="text-[10px] text-fg-muted font-mono tracking-widest uppercase">Tasks: {tasks.filter(t => t.milestone_id === m.id).length}</span>
                  </div>
                  <TasksPanel
                    tasks={tasks.filter(t => t.milestone_id === m.id)}
                    projectId={project.id}
                    userId={user.id}
                    onAdd={(payload) => handleAddTask(payload, m.id)}
                    onUpdate={async (taskId, updates) => {
                      const updatePayload = {
                        priority: updates.priority,
                        status: updates.status,
                        is_completed: updates.status === "done",
                      };
                      await handleUpdateTask(taskId, updatePayload);
                    }}
                    onDelete={handleDeleteTask}
                    onBulkDelete={async (ids) => { for(const tid of ids) await deleteTaskItem(tid); setTasks(prev => prev.filter(t => !ids.includes(t.id))); }}
                  />
                </div>
              ))}
          </div>
        );
      case "reports":
        return (
          <div className="max-w-5xl mx-auto">
            <ReportsCard 
              project={project} 
              onGenerateReport={async (type) => { 
                let content = "";
                if (type === 'today') {
                  const today = new Date().toISOString().split('T')[0];
                  const tLogs = logs.filter(l => l.created_at.startsWith(today));
                  content = `DAILY REPORT - ${today}\nProject: ${project.name}\n${"=".repeat(40)}\n\n`;
                  if (tLogs.length === 0) content += "No logs posted today.";
                  tLogs.forEach(l => {
                    content += `[Team]\n`;
                    content += `COMPLETED: ${l.completed_work}\n`;
                    content += `NEXT STEPS: ${l.next_steps}\n`;
                    content += `BLOCKERS: ${l.blockers || 'None'}\n\n`;
                  });
                } else {
                  content = `FULL PROJECT REPORT - ${project.name}\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(40)}\n\n`;
                  content += `CURRENT PROGRESS: ${progress}%\n\n`;
                  content += `MILESTONES SUMMARY:\n`;
                  milestones.forEach(m => content += `- ${m.title} [${m.status}]\n`);
                  content += `\nTASK LISTING:\n`;
                  tasks.forEach(t => content += `[${t.status === "done" ? 'X' : ' '}] ${t.title} (${t.priority}, ${t.status})\n`);
                  content += `\nWORK LOG HISTORY:\n`;
                  logs.forEach(l => content += `${l.created_at.split('T')[0]} - User: ${l.completed_work.slice(0, 50)}...\n`);
                }
                await createProjectReport({ project_id: project.id, user_id: user.id, type, content });
                return content;
              }} 
            />
          </div>
        );
      case "team":
        return (
          <ProjectTeamTab
            project={project}
            currentMemberRole={currentMemberRole}
            currentUserId={user.id}
          />
        );
      case "history":
        return (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🕘</span>
                  <h3 className="font-semibold text-fg-secondary text-sm">History</h3>
                </div>
                <span className="text-xs text-fg-muted">{historyTotal} logs</span>
              </div>

              {historyLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <InlineSpinner />
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-8 text-fg-muted text-sm">
                  No logs yet.
                </div>
              ) : (
                <HistoryList
                  project={project}
                  logs={historyLogs}
                  page={historyPage}
                  pageSize={historyPageSize}
                  total={historyTotal}
                  onPageChange={async (p) => {
                    setHistoryPage(p);
                    await loadHistory(p);
                  }}
                  onDeleteSelected={async (ids) => {
                    try {
                      const resp = await supabase.from("project_logs").delete().in("id", ids);
                      if (resp.error) throw resp.error;
                      await loadHistory(historyPage);
                      const updatedLogs = await getProjectLogs(project.id);
                      if (updatedLogs.error) throw updatedLogs.error;
                      setLogs(updatedLogs.data || []);
                      void logAppEvent({
                        type: "success",
                        module: "project.logs",
                        message: `Deleted ${ids.length} project log(s).`,
                        projectId: project.id,
                      });
                    } catch (error) {
                      console.error("Failed to delete selected project logs", error);
                      void logAppEvent({
                        type: "error",
                        module: "project.logs",
                        message: getErrorMessage(error, "Failed to delete project logs."),
                        projectId: project.id,
                      });
                      window.alert(getErrorMessage(error, "Failed to delete project logs."));
                    }
                  }}
                  onExportSelected={(ids) => {
                    const selected = historyLogs.filter(l => ids.includes(l.id));
                    let content = `Project: ${project.name}\n\n`;
                    selected.forEach((l, idx) => {
                      content += `--- Entry ${idx + 1} ---\n`;
                      content += `Date: ${l.created_at}\n`;
                      content += `Completed: ${l.completed_work ?? ""}\n`;
                      content += `Next Steps: ${l.next_steps ?? ""}\n`;
                      content += `Blockers: ${l.blockers ?? ""}\n`;
                      content += `Notes: ${l.notes ?? ""}\n\n`;
                    });
                    downloadTxt(`${project.name.replace(/\s+/g, "_")}_selected_logs.txt`, content);
                  }}
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><InlineSpinner /></div>;
  if (pageError) {
    return (
      <div className="rounded-2xl border border-rose-800/40 bg-rose-950/30 px-6 py-5 text-rose-100 space-y-3">
        <h2 className="text-lg font-bold">Project page failed to load</h2>
        <p className="text-sm text-rose-200">{pageError}</p>
      </div>
    );
  }
  if (!project) return <div className="p-12 text-center text-fg-muted">Project not found.</div>;

  return (
    <div className="space-y-6 max-w-full lg:max-w-7xl mx-auto w-full px-0 sm:px-2">
      <ProjectHeader 
        project={project} 
        progress={progress} 
        onRefresh={handleManualRefresh}
        refreshing={manualRefreshPending}
        onExport={async () => {
          try {
            const [mRes, tRes, lRes] = await Promise.all([
              getMilestones(project.id),
              getTaskItems(project.id),
              getAllProjectLogs(project.id),
            ]);
            if (mRes.error) throw mRes.error;
            if (tRes.error) throw tRes.error;
            if (lRes.error) throw lRes.error;

            let content = `PROJECT EXPORT\nProject: ${project.name}\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;
            content += `MILESTONES:\n`;
            (mRes.data || []).forEach((m) => {
              content += `- ${m.title} [${m.status}]\n`;
            });

            content += `\nTASKS:\n`;
            (tRes.data || []).forEach((t) => {
              content += `- ${t.title} | priority=${t.priority} | status=${t.status}\n`;
            });

            content += `\nLOGS:\n`;
            (lRes.data || []).forEach((l) => {
              content += `\n[${l.created_at}]\n`;
              content += `Completed: ${l.completed_work ?? ""}\n`;
              content += `Next Steps: ${l.next_steps ?? ""}\n`;
              content += `Blockers: ${l.blockers ?? ""}\n`;
              content += `Notes: ${l.notes ?? ""}\n`;
            });

            downloadTxt(`${project.name.replace(/\s+/g, "_")}_full_export.txt`, content);
          } catch (error) {
            console.error("ERROR - export full project", error);
            window.alert("Export failed. Check console for details.");
          }
        }} 
        onGenerateReport={() => {
          try {
            const latest = logs[0];
            if (!latest) {
              window.alert("No logs yet for today’s report.");
              return;
            }
            const content =
              `Project: ${project.name}\n\n` +
              `Completed Work:\n${latest.completed_work ?? ""}\n\n` +
              `Next Steps:\n${latest.next_steps ?? ""}\n\n` +
              `Blockers:\n${latest.blockers ?? ""}\n\n` +
              `Notes:\n${latest.notes ?? ""}\n`;
            downloadTxt(`${project.name.replace(/\s+/g, "_")}_today_report.txt`, content);
          } catch (error) {
            console.error("ERROR - generate today report", error);
            window.alert("Report generation failed. Check console for details.");
          }
        }} 
        onSaveToStuff={async () => {
          if (!user || !project) return;
          setSavingToStuff(true);
          try {
            const response = await createUserItem({
              user_id: user.id,
              type: "template",
              title: project.name,
              description: project.description || "Saved project snapshot from NodLync.",
              data: {
                route: `/projects/${project.id}`,
                projectId: project.id,
                projectName: project.name,
                status: project.status,
                progress,
                source: "projects",
              },
              tags: ["project", project.status, "template"],
            });
            if (response.error) throw new Error(response.error.message);
            window.alert("Saved to My Stuff.");
          } catch (error: any) {
            window.alert(error?.message ?? "Failed to save to My Stuff.");
          } finally {
            setSavingToStuff(false);
          }
        }}
        savingToStuff={savingToStuff}
        onAddUpdate={() => handleTabChange('overview')} 
      />

      <ProjectTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="animate-in fade-in duration-300">
        {renderTab()}
      </div>
    </div>
  );
};

export default ProjectManagerPage;
