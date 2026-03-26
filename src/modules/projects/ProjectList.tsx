import { useNavigate } from "react-router-dom";
import BulkDeleteBar from "../../components/BulkDeleteBar";
import IndeterminateCheckbox from "../../components/IndeterminateCheckbox";
import InlineSpinner from "../../components/InlineSpinner";
import PaginationControls from "../../components/PaginationControls";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { usePagination } from "../../hooks/usePagination";
import type { Project } from "../../types";
import ProjectRow from "./ProjectRow";

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

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;
    const confirmed = window.confirm(`Delete ${selection.selectedCount} selected project(s)?`);
    if (!confirmed) return;
    await onDeleteSelected(Array.from(selection.selectedIds));
    selection.clearSelection();
  };

  return (
    <div className="glass-panel relative z-0 flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-stroke px-4 py-3">
        <p className="font-semibold">Projects</p>
        <button
          type="button"
          className="btn-primary relative z-10 text-sm"
          onClick={onCreate}
          title="Create a new project"
        >
          + New Project
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

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-fg-muted">
            <InlineSpinner />
            <span>Loading projects...</span>
          </div>
        ) : null}

        {!loading && projects.length === 0 ? (
          <div className="flex flex-col items-center space-y-3 p-6 text-center text-sm text-fg-muted">
            <div className="text-3xl">Folder</div>
            <p className="font-medium text-fg-secondary">No projects yet</p>
            <p>Create your first project to get started.</p>
            <button type="button" className="btn-primary text-sm" onClick={onCreate}>
              Create project
            </button>
          </div>
        ) : null}

        {!loading
          ? pagination.paginatedItems.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                selected={project.id === selectedId}
                checked={selection.isSelected(project.id)}
                onToggleSelected={() => selection.toggleOne(project.id)}
                onSelect={() => onSelect(project)}
                onOpen={() => navigate(`/projects/${project.id}`)}
              />
            ))
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
            {projects.length} project{projects.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-fg-muted">single click = select · double click = full view</span>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ProjectList;
