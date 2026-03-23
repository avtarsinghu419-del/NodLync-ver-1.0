import { useEffect, useState } from "react";
import ProjectForm from "../modules/projects/ProjectForm";
import ProjectList from "../modules/projects/ProjectList";
import type { ProjectStatus } from "../types";
import DailySummaryModal from "../modules/projects/DailySummaryModal";
import ModuleHeader from "../components/ModuleHeader";
import { useProjects } from "../hooks/useProjects";

const ProjectsPage = () => {
  const {
    projects,
    loading,
    error,
    selectedProject,
    isCreateMode,
    fetchProjects,
    handleCreate,
    handleUpdate,
    handleDelete,
    setSelectedProject,
    setIsCreateMode,
    user,
  } = useProjects();

  const [formBusy, setFormBusy] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onAddProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    setFormBusy(true);
    await handleCreate(payload);
    setFormBusy(false);
  };

  const onEditProject = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!selectedProject) return;
    setFormBusy(true);
    await handleUpdate(selectedProject.id, payload);
    setFormBusy(false);
  };

  const onDeleteSelected = async (ids: string[]) => {
    setBulkDeleting(true);
    for (const id of ids) {
      await handleDelete(id);
    }
    setBulkDeleting(false);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-12">
      {/* Page Header */}
      <ModuleHeader title="Projects" description="WORKSPACE" icon="🚀">
        <button
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-semibold transition-all duration-200 border border-slate-700 flex items-center gap-2 shadow-lg shadow-black/40 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setShowSummary(true)}
          title="Daily log summary"
        >
          <span className="text-emerald-400">📊</span> Summary
        </button>
      </ModuleHeader>

      {/* Main Grid: Projects List + Selection/Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-5 h-full min-h-[400px]">
          <ProjectList
            projects={projects}
            selectedId={selectedProject?.id}
            onSelect={setSelectedProject}
            onCreate={() => setIsCreateMode(true)}
            onDeleteSelected={onDeleteSelected}
            loading={loading}
            bulkDeleting={bulkDeleting}
          />
        </div>

        <div className="lg:col-span-7 h-full">
          <ProjectForm
            key={selectedProject?.id || "create"}
            mode={isCreateMode ? "create" : "edit"}
            initial={selectedProject}
            onSubmit={isCreateMode ? onAddProject : onEditProject}
            onDelete={async () => { if (selectedProject) await handleDelete(selectedProject.id); }}
            onCancel={() => setIsCreateMode(false)}
            busy={formBusy}
            error={error}
          />
        </div>
      </div>

      {showSummary && user && (
        <DailySummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} userId={user.id} />
      )}
    </div>
  );
};

export default ProjectsPage;
