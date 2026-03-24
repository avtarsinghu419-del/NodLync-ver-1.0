import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../components/IndeterminateCheckbox";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import type { Project } from "../../types";
import StatusBadge from "../../components/StatusBadge";

interface Props {
  projects: Project[];
  selectedId?: string;
  onSelect: (project: Project) => void;
  onCreate: () => void;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  loading: boolean;
  bulkDeleting?: boolean;
}

const ProjectList = ({
  projects,
  selectedId,
  onSelect,
  onCreate,
  onDeleteSelected,
  loading,
  bulkDeleting,
}: Props) => {
  const navigate = useNavigate();
  const pagination = usePagination(projects);
  const selection = useBulkSelection(projects, (project) => project.id);
  const pageState = selection.getPageState(pagination.paginatedItems);
  const clickTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleClick = (project: Project) => {
    if (clickTimers.current[project.id]) {
      clearTimeout(clickTimers.current[project.id]);
      delete clickTimers.current[project.id];
      navigate(`/projects/${project.id}`);
      return;
    }

    clickTimers.current[project.id] = setTimeout(() => {
      delete clickTimers.current[project.id];
      onSelect(project);
    }, 250);
  };

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    const confirmed = window.confirm(`Delete ${selection.selectedCount} selected project(s)?`);
    if (!confirmed) return;
    await onDeleteSelected(Array.from(selection.selectedIds));
    selection.clearSelection();
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3 gap-3">
        <p className="font-semibold">Projects</p>
        <button className="btn-primary text-sm" onClick={onCreate} title="Create a new project">
          + New
        </button>
      </div>

      <div className="p-4 pb-0">
        <BulkDeleteBar
          count={selection.selectedCount}
          label="projects"
          onDelete={handleBulkDelete}
          onClear={selection.clearSelection}
          busy={bulkDeleting}
        />
      </div>

      {projects.length > 0 ? (
        <div className="flex items-center gap-3 px-4 pt-3 text-sm text-fg-muted">
          <IndeterminateCheckbox
            checked={pageState.checked}
            indeterminate={pageState.indeterminate}
            onChange={() => selection.togglePage(pagination.paginatedItems)}
            ariaLabel="Select all visible projects"
          />
          <span>Select visible projects</span>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800 mt-3">
        {loading ? (
          <div className="p-4 flex items-center gap-2 text-sm text-fg-muted">
            <InlineSpinner />
            <span>Loading projects...</span>
          </div>
        ) : null}

        {!loading && projects.length === 0 ? (
          <div className="p-6 text-sm text-fg-muted space-y-3 flex flex-col items-center text-center">
            <div className="text-3xl">Folder</div>
            <p className="font-medium text-fg-secondary">No projects yet</p>
            <p>Create your first project to get started.</p>
            <button className="btn-primary text-sm" onClick={onCreate}>
              Create project
            </button>
          </div>
        ) : null}

        {!loading
          ? pagination.paginatedItems.map((project) => {
              const isSelected = project.id === selectedId;
              return (
                <div
                  key={project.id}
                  className={`flex items-center gap-3 px-4 py-3 transition duration-150 group relative ${
                    isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-surface/70 border-l-2 border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selection.isSelected(project.id)}
                    onChange={() => selection.toggleOne(project.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Select ${project.name}`}
                  />
                  <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                    <button
                      className="flex-1 text-left outline-none min-w-0"
                      onClick={() => handleClick(project)}
                      title="Single click to edit. Double click to open full view."
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium truncate text-sm ${isSelected ? "text-primary" : "text-fg-secondary"}`}>
                          {project.name}
                        </p>
                        {project.is_shared ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-sky-500/30 bg-sky-500/10 text-sky-300">
                            Shared
                          </span>
                        ) : null}
                        <StatusBadge status={project.status} />
                      </div>
                      {project.description ? (
                        <p className="text-xs text-fg-muted truncate leading-relaxed">{project.description}</p>
                      ) : (
                        <p className="text-[10px] text-fg-muted italic">No description</p>
                      )}
                    </button>

                    <button
                      className="btn-ghost p-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition hover:bg-primary/20 hover:text-primary whitespace-nowrap bg-panel/50 border border-stroke rounded-lg shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      Open ➔
                    </button>
                  </div>
                </div>
              );
            })
          : null}
      </div>

      {projects.length > 0 ? (
        <>
          <PaginationControls
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="projects"
          />
          <div className="border-t border-stroke px-4 py-2 text-xs text-fg-muted">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · <span className="text-fg-muted">single click = edit · double click = full view</span>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ProjectList;

